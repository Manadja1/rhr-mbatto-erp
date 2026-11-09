import { Pool } from "pg";

// Connexion PostgreSQL Supabase (Pooler IPv4 eu-central-1 - Projet rhr-mbatto-db : usiiibljgooonksooqtm)
const DEFAULT_SUPABASE_DB_URL =
  "postgresql://postgres.usiiibljgooonksooqtm:opwhkhcoc3OU5xoq@aws-1-eu-central-1.pooler.supabase.com:5432/postgres";

function normalizeConnectionString(raw?: string): string {
  if (!raw || !raw.trim()) return DEFAULT_SUPABASE_DB_URL;
  // Nettoyer les crochets éventuels [mot_de_passe] copiés depuis le modèle Supabase
  return raw.trim().replace(/:(\[)([^\]]+)(\])@/, ":$2@");
}

const globalForPg = globalThis as unknown as {
  rhrPgPool?: Pool;
};

export function getDbPool(): Pool {
  if (!globalForPg.rhrPgPool) {
    const connectionString = normalizeConnectionString(
      process.env.DIRECT_URL || process.env.DATABASE_URL
    );
    globalForPg.rhrPgPool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
      max: 5,
      idleTimeoutMillis: 15000,
      connectionTimeoutMillis: 8000,
    });
  }
  return globalForPg.rhrPgPool;
}

