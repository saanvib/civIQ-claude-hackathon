/**
 * STEP 3 — Supabase client singleton.
 *
 * Supabase is our cache layer. Instead of hitting ProPublica on every
 * user request (slow + rate-limited), we seed legislators once and
 * serve them from Supabase in milliseconds.
 *
 * Get your free project at https://supabase.com
 * Then add to .env:
 *   SUPABASE_URL=https://your-project.supabase.co
 *   SUPABASE_ANON_KEY=your-anon-key
 */

import { createClient } from "@supabase/supabase-js";

let _client = null;

export function getSupabase() {
  if (_client) return _client;

  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      "Missing Supabase credentials. Set SUPABASE_URL and SUPABASE_ANON_KEY in your .env file."
    );
  }

  _client = createClient(url, key);
  return _client;
}
