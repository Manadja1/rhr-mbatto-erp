import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/supabase/db";

const ALLOWED_TABLES = new Set([
  "users",
  "waitresses",
  "rooms",
  "stays",
  "room_folio_items",
  "inventory_items",
  "pos_orders",
  "ceremony_bookings",
  "transactions",
  "cash_closures",
  "fixed_costs",
]);

export async function GET() {
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
  } catch (error) {
    return NextResponse.json(
      {
        connected: false,
        error: error instanceof Error ? error.message : "Database connection failed",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const operations = Array.isArray(body.operations) ? body.operations : [];
    const pool = getDbPool();
    let processed = 0;

    for (const op of operations) {
      const table = String(op.table || "");
      const action = String(op.action || "");
      const p = op.payload || {};

      if (!ALLOWED_TABLES.has(table)) continue;

      try {
        if (action === "DELETE" && p.id) {
          await pool.query(`DELETE FROM public.${table} WHERE id = $1`, [
            String(p.id),
          ]);
          processed++;
          continue;
        }

        if (table === "users") {
          if (action === "INSERT" && p.id && p.email) {
            await pool.query(
              `INSERT INTO public.users (id, email, full_name, role, pin_code, password_hash, phone, badge_label, is_active)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE)
               ON CONFLICT (id) DO UPDATE SET
                 email = EXCLUDED.email,
                 full_name = EXCLUDED.full_name,
                 role = EXCLUDED.role`,
              [
                String(p.id),
                String(p.email),
                String(p.fullName || p.email),
                String(p.role || "CAISSIERE_BAR_RESTO"),
                String(p.pinCode || "0000"),
                String(p.password || "rhr2026"),
                String(p.phone || ""),
                String(p.badgeLabel || ""),
              ]
            );
          } else if (action === "UPDATE" && p.id) {
            if (p.pinCode) {
              await pool.query(
                `UPDATE public.users SET pin_code = $2, updated_at = NOW() WHERE id = $1`,
                [String(p.id), String(p.pinCode)]
              );
            }
            if (p.fullName) {
              await pool.query(
                `UPDATE public.users SET full_name = $2, updated_at = NOW() WHERE id = $1`,
                [String(p.id), String(p.fullName)]
              );
            }
          }
          processed++;
        } else if (table === "waitresses") {
          if (action === "INSERT" && p.id && p.name) {
            await pool.query(
              `INSERT INTO public.waitresses (id, name, phone, is_active)
               VALUES ($1, $2, $3, TRUE)
               ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name`,
              [String(p.id), String(p.name), String(p.phone || "")]
            );
          } else if (action === "UPDATE" && p.id) {
            if (p.name !== undefined) {
              await pool.query(
                `UPDATE public.waitresses SET name = $2 WHERE id = $1`,
                [String(p.id), String(p.name)]
              );
            }
            if (p.phone !== undefined) {
              await pool.query(
                `UPDATE public.waitresses SET phone = $2 WHERE id = $1`,
                [String(p.id), String(p.phone)]
              );
            }
          }
          processed++;
        } else if (table === "inventory_items") {
          if (action === "INSERT" && p.id && p.name) {
            await pool.query(
              `INSERT INTO public.inventory_items (id, sku, name, pole, category, unit_price, stock_quantity)
               VALUES ($1, $2, $3, $4, $5, $6, $7)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 unit_price = EXCLUDED.unit_price`,
              [
                String(p.id),
                String(p.sku || `SKU-${Date.now()}`),
                String(p.name),
                String(p.pole || "BAR_BOISSON"),
                String(p.category || "Divers"),
                Number(p.unitPrice || 0),
                Number(p.stockQuantity || 0),
              ]
            );
          } else if (action === "UPDATE" && p.id) {
            if (p.unitPrice !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET unit_price = $2, updated_at = NOW() WHERE id = $1`,
                [String(p.id), Number(p.unitPrice)]
              );
            }
            if (p.stockQuantity !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET stock_quantity = $2, updated_at = NOW() WHERE id = $1`,
                [String(p.id), Number(p.stockQuantity)]
              );
            }
            if (p.imageEmoji !== undefined) {
              await pool.query(
                `UPDATE public.inventory_items SET image_emoji = $2, updated_at = NOW() WHERE id = $1`,
                [String(p.id), String(p.imageEmoji)]
              );
            }
          }
          processed++;
        } else if (table === "pos_orders") {
          if (action === "INSERT" && p.id) {
            await pool.query(
              `INSERT INTO public.pos_orders (id, order_number, source, table_or_room_label, waitress_name, items, total_amount, payment_mode, status)
               VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7, $8, $9)
               ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, payment_mode = EXCLUDED.payment_mode`,
              [
                String(p.id),
                String(p.orderNumber || `CMD-${Date.now()}`),
                String(p.source || "COMPTOIR_POS"),
                String(p.tableOrRoomLabel || "Comptoir"),
                String(p.waitressName || "Direct Comptoir"),
                JSON.stringify(p.items || []),
                Number(p.totalAmount || 0),
                String(p.paymentMode || "ESPECES"),
                String(p.status || "PAYEE"),
              ]
            );
          } else if (action === "UPDATE" && p.id && p.status) {
            await pool.query(
              `UPDATE public.pos_orders SET status = $2 WHERE id = $1`,
              [String(p.id), String(p.status)]
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
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Sync error",
      },
      { status: 500 }
    );
  }
}

