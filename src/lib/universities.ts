import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { requestTime } from "@/lib/format";
import { searchUniversityDirectory } from "@/lib/university-directory";

export type UniversityMatch = { id: string; name: string; city: string | null; state: string | null };

function escapeLike(value: string): string {
  return value.replace(/[\\%_]/g, (c) => `\\${c}`);
}

const COLUMNS = "id, name, city, state, slug";

export async function searchUniversities(supabase: SupabaseClient, query: string, limit = 12): Promise<UniversityMatch[]> {
  const q = query.trim().slice(0, 100);
  if (q.length < 2) return [];
  const [{ data: local }, external] = await Promise.all([
    supabase.from("universities").select(COLUMNS).ilike("name", `%${escapeLike(q)}%`).order("name").limit(limit),
    searchUniversityDirectory(q, limit, requestTime()),
  ]);
  const rows = (local ?? []) as Array<UniversityMatch & { slug: string }>;
  const known = new Set(rows.flatMap((r) => [r.slug, r.name.toLowerCase()]));
  const missing = external.filter((u) => !known.has(u.slug) && !known.has(u.name.toLowerCase()));
  if (missing.length) {
    const admin = createAdminClient();
    await admin.from("universities").upsert(
      missing.map((u) => ({ name: u.name, slug: u.slug, state: u.state, email_domains: u.email_domains })),
      { onConflict: "slug", ignoreDuplicates: true },
    );
    const { data: added } = await admin.from("universities").select(COLUMNS).in("slug", missing.map((u) => u.slug));
    rows.push(...((added ?? []) as Array<UniversityMatch & { slug: string }>).filter((r) => !rows.some((x) => x.id === r.id)));
  }
  const order = new Map(external.map((u, i) => [u.slug, i]));
  const lower = q.toLowerCase();
  return rows
    .sort((a, b) => {
      const ra = order.get(a.slug) ?? (a.name.toLowerCase().startsWith(lower) ? -1 : limit);
      const rb = order.get(b.slug) ?? (b.name.toLowerCase().startsWith(lower) ? -1 : limit);
      return ra - rb || a.name.localeCompare(b.name);
    })
    .slice(0, limit)
    .map(({ id, name, city, state }) => ({ id, name, city, state }));
}
