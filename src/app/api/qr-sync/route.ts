import { NextResponse } from "next/server";
import os from "os";
import { PosOrder, PosOrderItem, InventoryItem } from "@/store/useRhrStore";
import { getDbPool, isDatabaseUrlConfigured } from "@/lib/supabase/db";

interface ServerQrSyncState {
  qrOrders: PosOrder[];
  catalogSnapshot: InventoryItem[];
  updatedAt: string;
}

const globalForQrSync = globalThis as unknown as {
  rhrQrSyncState?: ServerQrSyncState;
};

if (!globalForQrSync.rhrQrSyncState) {
  globalForQrSync.rhrQrSyncState = {
    qrOrders: [],
    catalogSnapshot: [],
    updatedAt: new Date().toISOString(),
  };
}

// Protection anti-spam sur les commandes QR publiques (max 30 requêtes POST / minute par IP)
const qrRateLimit = new Map<string, { count: number; resetAt: number }>();

function checkQrRateLimit(ip: string, limit = 30): boolean {
  const now = Date.now();
  const entry = qrRateLimit.get(ip);
  if (!entry || now > entry.resetAt) {
    qrRateLimit.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= limit) return false;
  entry.count += 1;
  return true;
}

function sanitizeLabel(input: unknown, maxLen = 80): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

function getLocalLanIp(): string | null {
  try {
    const nets = os.networkInterfaces();
    const candidates: { name: string; address: string; priority: number }[] = [];
    for (const name of Object.keys(nets)) {
      const ifaceList = nets[name];
      if (!ifaceList) continue;
      const lower = name.toLowerCase();
      if (
        lower.includes("vethernet") ||
        lower.includes("wsl") ||
        lower.includes("virtual") ||
        lower.includes("vbox") ||
        lower.includes("docker")
      ) {
        continue;
      }
      for (const net of ifaceList) {
        if (net.family === "IPv4" && !net.internal) {
          const priority =
            lower.includes("wi-fi") || lower.includes("wifi") || lower.includes("wlan")
              ? 1
              : lower.includes("ethernet")
              ? 2
              : 3;
          candidates.push({ name, address: net.address, priority });
        }
      }
    }
    candidates.sort((a, b) => a.priority - b.priority);
    if (candidates.length > 0) {
      return candidates[0].address;
    }
  } catch {
    // Ignorer en environnement serverless
  }
  return null;
}

export async function GET() {
  const state = globalForQrSync.rhrQrSyncState!;
  const lanIp = getLocalLanIp();

  if (isDatabaseUrlConfigured()) {
    try {
      const pool = getDbPool();
      const dbRes = await pool.query(
        `SELECT id, order_number, source, table_or_room_label, waitress_id, waitress_name, items, total_amount, payment_mode, status, created_by, created_at
         FROM public.pos_orders
         WHERE status = 'NOUVELLE_QR'
         ORDER BY created_at DESC
         LIMIT 30`
      );
      const dbOrders: PosOrder[] = dbRes.rows.map((r) => ({
        id: r.id,
        orderNumber: r.order_number,
        source: r.source,
        tableOrRoomLabel: r.table_or_room_label,
        waitressId: r.waitress_id || "wait-awa",
        waitressName: r.waitress_name || "À attribuer (QR)",
        items: Array.isArray(r.items) ? r.items : [],
        totalAmount: Number(r.total_amount || 0),
        paymentMode: r.payment_mode || "EN_ATTENTE_QR",
        status: r.status || "NOUVELLE_QR",
        createdBy: r.created_by || "usr-client-05",
        createdAt:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at || new Date().toISOString()),
      }));

      for (const dbo of dbOrders) {
        if (!state.qrOrders.some((o) => o.id === dbo.id)) {
          state.qrOrders.unshift(dbo);
        }
      }
    } catch {
      // Fallback mémoire si hors-ligne
    }
  }

  return NextResponse.json({
    lanIp,
    qrOrders: state.qrOrders,
    catalogSnapshot: state.catalogSnapshot,
    updatedAt: state.updatedAt,
  });
}

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkQrRateLimit(clientIp, 30)) {
    return NextResponse.json(
      { success: false, error: "Trop de requêtes. Veuillez patienter." },
      { status: 429 }
    );
  }

  try {
    const body = await request.json();
    const state = globalForQrSync.rhrQrSyncState!;

    // 1. Le client vient de scanner un QR code et d'envoyer une commande depuis son téléphone
    if (body.action === "SUBMIT_QR_ORDER" && body.order) {
      const rawOrder = body.order;
      const rawItems = Array.isArray(rawOrder.items)
        ? rawOrder.items.slice(0, 30)
        : [];
      if (rawItems.length === 0) {
        return NextResponse.json(
          { success: false, error: "Panier vide." },
          { status: 400 }
        );
      }

      // Validation et recalcul strict des montants côté serveur (anti-falsification des prix/quantités)
      const validatedItems: PosOrderItem[] = rawItems
        .map((it: Record<string, unknown>) => {
          const qty = Math.min(50, Math.max(1, Math.round(Number(it.quantity || 1))));
          const price = Math.max(0, Math.round(Number(it.unitPrice || 0)));
          return {
            itemId: sanitizeLabel(it.itemId, 60) || "item",
            name: sanitizeLabel(it.name, 100) || "Article RHR",
            quantity: qty,
            unitPrice: price,
            subtotal: qty * price,
            pole:
              it.pole === "PLAT_MENU" ? "PLAT_MENU" : "BAR_BOISSON",
          };
        })
        .filter((it: PosOrderItem) => it.unitPrice > 0);

      if (validatedItems.length === 0) {
        return NextResponse.json(
          { success: false, error: "Articles invalides." },
          { status: 400 }
        );
      }

      const computedTotal = validatedItems.reduce(
        (sum, i) => sum + i.subtotal,
        0
      );

      const incoming: PosOrder = {
        id: sanitizeLabel(rawOrder.id, 60) || `ord-qr-${Date.now()}`,
        orderNumber:
          sanitizeLabel(rawOrder.orderNumber, 40) || `CMD-QR-${Date.now()}`,
        source:
          rawOrder.source === "QR_CHAMBRE" ? "QR_CHAMBRE" : "QR_TABLE",
        tableOrRoomLabel:
          sanitizeLabel(rawOrder.tableOrRoomLabel, 80) || "Table QR",
        waitressId: "wait-awa",
        waitressName: "À attribuer (QR)",
        items: validatedItems,
        totalAmount: computedTotal,
        paymentMode: "EN_ATTENTE_QR",
        status: "NOUVELLE_QR",
        createdBy: "usr-client-05",
        createdAt: new Date().toISOString(),
      };

      const exists = state.qrOrders.some((o) => o.id === incoming.id);
      if (!exists) {
        state.qrOrders = [incoming, ...state.qrOrders].slice(0, 50);
        state.updatedAt = new Date().toISOString();
      }

      if (isDatabaseUrlConfigured()) {
        try {
          const pool = getDbPool();
          await pool.query(
            `INSERT INTO public.pos_orders (id, order_number, source, table_or_room_label, waitress_name, items, total_amount, payment_mode, status, created_by)
             VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, 'NOUVELLE_QR', 'usr-client-05')
             ON CONFLICT (id) DO NOTHING`,
            [
              incoming.id,
              incoming.orderNumber,
              incoming.source,
              incoming.tableOrRoomLabel,
              incoming.waitressName,
              JSON.stringify(incoming.items),
              incoming.totalAmount,
              incoming.paymentMode,
            ]
          );
        } catch {
          // Fallback mémoire si hors-ligne
        }
      }

      return NextResponse.json({
        success: true,
        order: incoming,
        qrOrders: state.qrOrders,
      });
    }

    // 2. La caisse Bar/Resto met à jour le statut d'une commande QR (validée ou annulée) ou synchronise le catalogue
    if (body.action === "SYNC_FROM_POS") {
      if (Array.isArray(body.inventory)) {
        state.catalogSnapshot = body.inventory.slice(0, 200);
      }
      if (typeof body.resolvedOrderId === "string") {
        const cleanId = sanitizeLabel(body.resolvedOrderId, 60);
        state.qrOrders = state.qrOrders.filter((o) => o.id !== cleanId);
        if (isDatabaseUrlConfigured() && cleanId) {
          try {
            const pool = getDbPool();
            await pool.query(
              `UPDATE public.pos_orders SET status = 'PAYEE' WHERE id = $1 AND status = 'NOUVELLE_QR'`,
              [cleanId]
            );
          } catch {
            // Ignorer si hors-ligne
          }
        }
      }
      state.updatedAt = new Date().toISOString();
      return NextResponse.json({
        success: true,
        qrOrders: state.qrOrders,
      });
    }

    return NextResponse.json({ success: false }, { status: 400 });
  } catch {
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
