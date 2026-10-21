import "server-only";
import { createServerClient, parseCookieHeader } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { connection } from "next/server";
import { serverEnv } from "@/lib/env";

export async function createClient(options: { persistSession?: boolean } = {}) {
  await connection();
  if (!options.persistSession) {
    let parsed: Array<{ name: string; value: string }>;
    try {
      parsed = (await cookies()).getAll();
    } catch {
      const header = (await headers()).get("cookie") ?? "";
      parsed = parseCookieHeader(header).map(({ name, value }) => ({ name, value: value ?? "" }));
    }
    return createServerClient(serverEnv.supabaseUrl(), serverEnv.supabasePublishableKey(), {
      cookies: {
        getAll() {
          return parsed;
        },
        setAll() {},
      },
    });
  }
  const cookieStore = await cookies();
  return createServerClient(serverEnv.supabaseUrl(), serverEnv.supabasePublishableKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options: cookieOptions } of cookiesToSet) cookieStore.set(name, value, cookieOptions);
        } catch {}
      },
    },
  });
}

export async function createSessionClient() {
  return createClient({ persistSession: true });
}
