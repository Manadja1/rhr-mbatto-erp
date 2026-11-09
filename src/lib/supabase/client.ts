import { createClient } from "@supabase/supabase-js";

// Projet Supabase : rhr-mbatto-db (ID: usiiibljgooonksooqtm, Région: eu-central-1)
export const SUPABASE_PROJECT_ID = "usiiibljgooonksooqtm";
export const SUPABASE_DEFAULT_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co`;

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_DEFAULT_URL;

// Supporte à la fois la nouvelle clé Supabase 2026 (Publishable key : sb_publishable_...)
// et l'ancienne clé Legacy (anon public : eyJ...)
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
  "sb_publishable_SppXQcVaNPgMu89F4YNREA_rhr_mbatto_db";

export const isSupabaseConfigured = true;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
