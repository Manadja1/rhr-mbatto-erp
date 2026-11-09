import { NextResponse } from "next/server";
import os from "os";
import { PosOrder, InventoryItem } from "@/store/useRhrStore";
import { getDbPool } from "@/lib/supabase/db";

// Stockage mémoire + persistance PostgreSQL Supabase (rhr-mbatto-db) pour synchroniser
// en temps réel les commandes QR passées depuis le smartphone d'un client vers la Caisse (/pos)
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
    // Ignorer en environnement edge/serverless
  }
  return null;
}

export async function GET() {
  const state = globalForQrSync.rhrQrSyncState!;
  const lanIp = getLocalLanIp();

  // Synchroniser depuis la base PostgreSQL Supabase (rhr-mbatto-db) pour Vercel Serverless
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
    // Fallback sur le cache mémoire si hors-ligne
  }

  return NextResponse.json({
    lanIp,
    qrOrders: state.qrOrders,
    catalogSnapshot: state.catalogSnapshot,
    updatedAt: state.updatedAt,
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const state = globalForQrSync.rhrQrSyncState!;

    // 1. Le client vient de scanner un QR code et d'envoyer une commande depuis son téléphone
    if (body.action === "SUBMIT_QR_ORDER" && body.order) {
      const incoming: PosOrder = body.order;
      const exists = state.qrOrders.some((o) => o.id === incoming.id);
      if (!exists) {
        state.qrOrders = [incoming, ...state.qrOrders].slice(0, 50);
        state.updatedAt = new Date().toISOString();
      }

      // Persister immédiatement dans PostgreSQL Supabase (rhr-mbatto-db)
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
            incoming.waitressName || "À attribuer (QR)",
            JSON.stringify(incoming.items || []),
            incoming.totalAmount,
            incoming.paymentMode || "EN_ATTENTE_QR",
          ]
        );
      } catch {
        // Fallback mémoire si hors-ligne
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
        state.catalogSnapshot = body.inventory;
      }
      if (typeof body.resolvedOrderId === "string") {
        state.qrOrders = state.qrOrders.filter(
          (o) => o.id !== body.resolvedOrderId
        );
        try {
          const pool = getDbPool();
          await pool.query(
            `UPDATE public.pos_orders SET status = 'PAYEE' WHERE id = $1 AND status = 'NOUVELLE_QR'`,
            [body.resolvedOrderId]
          );
        } catch {
          // Ignorer si hors-ligne
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
