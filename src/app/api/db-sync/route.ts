import { NextResponse } from "next/server";
import { getDbPool, isDatabaseUrlConfigured } from "@/lib/supabase/db";

// Protection Rate-Limit par IP en mémoire (max 60 requêtes / minute)
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string, maxRequests = 60): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(ip);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  if (entry.count >= maxRequests) {
    return false;
  }
  entry.count += 1;
  return true;
}

function sanitizeText(val: unknown, maxLen = 160): string {
  if (typeof val !== "string") return "";
  return val
    .replace(/[\u0000-\u001F\u007F<>]/g, "")
    .trim()
    .slice(0, maxLen);
}

// Dictionnaire statique de requêtes DELETE paramétrées (aucune interpolation dynamique de nom de table)
const SAFE_DELETE_QUERIES: Record<string, string> = {
  users: "DELETE FROM public.users WHERE id = $1 AND id <> 'usr-admin-01'",
  waitresses: "DELETE FROM public.waitresses WHERE id = $1",
  inventory_items: "DELETE FROM public.inventory_items WHERE id = $1",
  pos_orders: "DELETE FROM public.pos_orders WHERE id = $1",
  stays: "DELETE FROM public.stays WHERE id = $1",
  room_folio_items: "DELETE FROM public.room_folio_items WHERE id = $1",
  ceremony_bookings: "DELETE FROM public.ceremony_bookings WHERE id = $1",
  transactions: "DELETE FROM public.transactions WHERE id = $1",
  cash_closures: "DELETE FROM public.cash_closures WHERE id = $1",
  fixed_costs: "DELETE FROM public.fixed_costs WHERE id = $1",
};

export async function GET(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(clientIp, 60)) {
    return NextResponse.json(
      { connected: false, error: "Trop de requêtes. Veuillez patienter." },
      { status: 429 }
    );
  }

  if (!isDatabaseUrlConfigured()) {
    return NextResponse.json(
      {
        connected: false,
        error: "Variables DATABASE_URL / DIRECT_URL non configurées.",
      },
      { status: 503 }
    );
  }

  try {
    const pool = getDbPool();
    const res = await pool.query(`
      SELECT
        (SELECT count(*)::int FROM public.users) AS users,
        (SELECT count(*)::int FROM public.waitresses) AS waitresses,
        (SELECT count(*)::int FROM public.rooms) AS rooms,
        (SELECT count(*)::int FROM public.inventory_items) AS inventory_items,
        (SELECT count(*)::int FROM public.pos_orders) AS pos_orders,
        (SELECT count(*)::int FROM public.transactions) AS transactions
    `);

    return NextResponse.json({
      connected: true,
      projectName: "rhr-mbatto-db",
      projectId: "usiiibljgooonksooqtm",
      region: "eu-central-1",
      counts: res.rows[0],
      checkedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        connected: false,
        error: "Connexion à la base de données temporairement indisponible.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const clientIp =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!checkRateLimit(clientIp, 60)) {
    return NextResponse.json(
      { success: false, error: "Trop de requêtes." },
      { status: 429 }
    );
  }

  if (!isDatabaseUrlConfigured()) {
    return NextResponse.json({
      success: true,
      processed: 0,
      mode: "offline-local",
    });
  }

  try {
    const body = await request.json();
    const rawOps = Array.isArray(body.operations) ? body.operations : [];
    // Limiter la taille maximale d'un lot de synchronisation (anti-DoS)
    const operations = rawOps.slice(0, 50);
    const pool = getDbPool();
    let processed = 0;

    for (const op of operations) {
      const table = sanitizeText(op.table, 40);
      const action = sanitizeText(op.action, 16);
      const p =
        op.payload && typeof op.payload === "object" ? op.payload : {};
      const recordId = sanitizeText(p.id, 80);

      try {
        if (action === "DELETE" && recordId && SAFE_DELETE_QUERIES[table]) {
          await pool.query(SAFE_DELETE_QUERIES[table], [recordId]);
          processed++;
          continue;
        }

        if (table === "users" && recordId) {
          if (action === "INSERT" && p.email) {
            await pool.query(
              `INSERT INTO public.users (id, email, full_name, role, pin_code, password_hash, phone, badge_label, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
               ON CONFLICT (id) DO UPDATE SET
                 email = EXCLUDED.email,
                 full_name = EXCLUDED.full_name,
                 role = EXCLUDED.role`,
              [
                recordId,
                sanitizeText(p.email, 120).toLowerCase(),
                sanitizeText(p.fullName || p.email, 120),
                sanitizeText(p.role || "CAISSIERE_BAR_RESTO", 40),
                sanitizeText(p.pinCode || "0000", 4),
                sanitizeText(p.password || "rhr2026", 120),
                sanitizeText(p.phone || "", 40),
                sanitizeText(p.badgeLabel || "", 80),
              ]
            );
          } else if (action === "UPDATE") {
            if (p.pinCode && /^\d{4}$/.test(String(p.pinCode))) {
              await pool.query(
                `UPDATE public.users SET pin_code = $2, updated_at = NOW() WHERE id = $1`,
                [recordId, String(p.pinCode)]
              );
            }
            if (p.fullName) {
              await pool.query(
                `UPDATE public.users SET full_name = $2, updated_at = NOW() WHERE id = $1`,
                [recordId, sanitizeText(p.fullName, 120)]
              );
            }
          }
          processed++;
        } else if (table === "waitresses" && recordId) {
          if (action === "INSERT" && p.name) {
            await pool.query(
              `INSERT INTO public.waitresses (id, name, phone, is_active)
               VALUES ($1, $2, $3, TRUE)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
              [
                recordId,
                sanitizeText(p.name, 80),
                sanitizeText(p.phone || "", 40),
              ]
            );
          } else if (action === "UPDATE") {
            if (p.name !== undefined) {
              await pool.query(
                `UPDATE public.waitresses SET name = $2 WHERE id = $1`,
                [recordId, sanitizeText(p.name, 80)]
              );
            }
            if (p.phone !== undefined) {
              await pool.query(
                `UPDATE public.waitresses SET phone = $2 WHERE id = $1`,
                [recordId, sanitizeText(p.phone, 40)]
              );
            }
          }
          processed++;
        } else if (table === "inventory_items" && recordId) {
          if (action === "INSERT" && p.name) {
            await pool.query(
              `INSERT INTO public.inventory_items (id, sku, name, pole, category, unit_price, stock_quantity)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 unit_price = EXCLUDED.unit_price`,
              [
                recordId,
                sanitizeText(p.sku || `SKU-${Date.now()}`, 40),
                sanitizeText(p.name, 120),
                sanitizeText(p.pole || "BAR_BOISSON", 30),
                sanitizeText(p.category || "Divers", 60),
                Math.max(0, Math.round(Number(p.unitPrice || 0))),
                Math.max(0, Math.round(Number(p.stockQuantity || 0))),
              ]
            );
          } else if (action === "UPDATE") {
            if (p.unitPrice !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET unit_price = $2, updated_at = NOW() WHERE id = $1`,
                [recordId, Math.max(0, Math.round(Number(p.unitPrice)))]
              );
            }
            if (p.stockQuantity !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET stock_quantity = $2, updated_at = NOW() WHERE id = $1`,
                [recordId, Math.max(0, Math.round(Number(p.stockQuantity)))]
              );
            }
            if (p.imageEmoji !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET image_emoji = $2, updated_at = NOW() WHERE id = $1`,
                [recordId, sanitizeText(p.imageEmoji, 16)]
              );
            }
          }
          processed++;
        } else if (table === "pos_orders" && recordId) {
          if (action === "INSERT") {
            await pool.query(
              `INSERT INTO public.pos_orders (id, order_number, source, table_or_room_label, waitress_name, items, total_amount, payment_mode, status)
               VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payment_mode = EXCLUDED.payment_mode`,
              [
                recordId,
                sanitizeText(p.orderNumber || `CMD-${Date.now()}`, 40),
                sanitizeText(p.source || "COMPTOIR_POS", 30),
                sanitizeText(p.tableOrRoomLabel || "Comptoir", 80),
                sanitizeText(p.waitressName || "Direct Comptoir", 80),
                JSON.stringify(Array.isArray(p.items) ? p.items.slice(0, 50) : []),
                Math.max(0, Math.round(Number(p.totalAmount || 0))),
                sanitizeText(p.paymentMode || "ESPECES", 30),
                sanitizeText(p.status || "PAYEE", 30),
              ]
            );
          } else if (action === "UPDATE" && p.status) {
            await pool.query(
              `UPDATE public.pos_orders SET status = $2 WHERE id = $1`,
              [recordId, sanitizeText(p.status, 30)]
            );
          }
          processed++;
        } else {
          processed++;
        }
      } catch {
        // Ignorer une opération individuelle non bloquante
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      syncedAt: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Requête de synchronisation invalide.",
      },
      { status: 400 }
    );
  }
}
