import { Pool } from "pg";

function normalizeConnectionString(raw?: string): string {
  if (!raw || !raw.trim()) {
    throw new Error(
      "Variable d'environnement DATABASE_URL ou DIRECT_URL manquante."
    );
  }
  // Nettoyer les crochets éventuels [mot_de_passe] copiés depuis le modèle Supabase
  return raw.trim().replace(/:(\[)([^\]]+)(\])@/, ":$2@");
}

const globalForPg = globalThis as unknown as {
  rhrPgPool?: Pool;
};

export function isDatabaseUrlConfigured(): boolean {
  return Boolean(
    (process.env.DIRECT_URL && process.env.DIRECT_URL.trim()) ||
      (process.env.DATABASE_URL && process.env.DATABASE_URL.trim())
  );
}

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
      statement_timeout: 10000,
    });
  }
  return globalForPg.rhrPgPool;
}
