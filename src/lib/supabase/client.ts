"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let client: SupabaseClient | null = null;

export function createBrowserSupabase(url: string, key: string): SupabaseClient {
  if (!client) client = createBrowserClient(url, key);
  return client;
}
