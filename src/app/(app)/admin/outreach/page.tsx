import Link from "next/link";
import { SubmitButton } from "@/components/forms";
import { Badge, Input, Notice, PageHeader, Stat, StatGrid } from "@/components/ui";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { gatherUniversity, loadSchoolPhoto } from "./actions";
import { SchoolPhoto } from "./school-photo";

const STATES = ["AL", "AK", "AZ", "AR", "CA", "CO", "CT", "DE", "DC", "FL", "GA", "HI", "ID", "IL", "IN", "IA", "KS", "KY", "LA", "ME", "MD", "MA", "MI", "MN", "MS", "MO", "MT", "NE", "NV", "NH", "NJ", "NM", "NY", "NC", "ND", "OH", "OK", "OR", "PA", "RI", "SC", "SD", "TN", "TX", "UT", "VT", "VA", "WA", "WV", "WI", "WY"];
const PAGE_SIZE = 24;

type School = { id: string; name: string; city: string | null; state: string | null; email_domains: string[] };
type Research = { university_id: string; image_url: string | null; research_status: string; chapters_found: number; emails_found: number; facts_found: number };

function hrefFor(page: number, q: string, state: string): string {
  const params = new URLSearchParams();
  if (q) params.set("q", q);
  if (state) params.set("state", state);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/outreach?${query}` : "/admin/outreach";
}

export default async function OutreachPage({ searchParams }: PageProps<"/admin/outreach">) {
  await requireStaff([]);
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const state = typeof sp.state === "string" && STATES.includes(sp.state) ? sp.state : "";
  const page = Math.max(1, Number(sp.page) || 1);
  const supabase = await createClient();

  let schools: School[] = [];
  let total = 0;
  let directoryError: string | null = null;
  if (q.length >= 2) {
    const { data, error } = await supabase.rpc("search_universities", { p_query: q, p_limit: PAGE_SIZE });
    if (error) directoryError = error.message;
    schools = ((data ?? []) as School[]).filter((school) => !state || school.state === state);
    total = schools.length;
  } else {
    const from = (page - 1) * PAGE_SIZE;
    let query = supabase.from("universities").select("id, name, city, state, email_domains", { count: "exact" }).eq("source", "ipeds").order("name");
    if (state) query = query.eq("state", state);
    const { data, count, error } = await query.range(from, from + PAGE_SIZE - 1);
    if (error) directoryError = error.message;
    schools = (data ?? []) as School[];
    total = count ?? schools.length;
  }

  const researchQuery = schools.length
    ? await supabase.from("university_outreach").select("university_id, image_url, research_status, chapters_found, emails_found, facts_found").in("university_id", schools.map((school) => school.id))
    : { data: [], error: null };
  const migrationMissing = Boolean(researchQuery.error && /does not exist|schema cache/i.test(researchQuery.error.message));
  const research = new Map(((researchQuery.data ?? []) as Research[]).map((row) => [row.university_id, row]));
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Universities"
        description="Accredited U.S. schools already in GreekGeek. Photos load from Wikipedia. Gather info reads one school's own site when you ask it to."
        actions={<Link href="/admin/outreach/emails" className="text-sm text-ink-2 hover:text-ink">Saved emails</Link>}
      />
      {directoryError ? <Notice tone="danger">{directoryError}</Notice> : null}
      {migrationMissing ? <Notice tone="danger">The university outreach migration is not on this database yet. Run npx supabase db push.</Notice> : null}

      <StatGrid>
        <Stat label="Schools" value={total.toLocaleString("en-US")} hint={state ? state : q ? "Matching your search" : "U.S. directory"} />
        <Stat label="Gathered" value={migrationMissing ? "No data" : [...research.values()].filter((row) => row.research_status === "done").length} hint="On this page" />
        <Stat label="Chapters found" value={migrationMissing ? "No data" : [...research.values()].reduce((sum, row) => sum + row.chapters_found, 0)} hint="On this page" />
        <Stat label="Emails found" value={migrationMissing ? "No data" : [...research.values()].reduce((sum, row) => sum + row.emails_found, 0)} hint="On this page" />
      </StatGrid>

      <form action="/admin/outreach" className="flex flex-wrap gap-2">
        <Input name="q" defaultValue={q} placeholder="Search by name or email domain" aria-label="Search universities" className="sm:max-w-sm" />
        <select name="state" defaultValue={state} aria-label="State" className="h-9 rounded-md border border-line-strong bg-surface px-3 text-sm text-ink">
          <option value="">All states</option>
          {STATES.map((item) => <option key={item} value={item}>{item}</option>)}
        </select>
        <button type="submit" className="h-9 rounded-md border border-line-strong px-3 text-sm text-ink hover:bg-subtle">Search</button>
      </form>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {schools.map((school) => {
          const info = research.get(school.id);
          const domain = school.email_domains?.[0];
          return (
            <li key={school.id} className="overflow-hidden rounded-lg border border-line bg-surface">
              <Link href={`/admin/outreach/schools/${school.id}`} className="block">
                <div className="aspect-[16/10] overflow-hidden bg-subtle">
                  <SchoolPhoto id={school.id} name={school.name} initialUrl={info?.image_url?.includes("/640px-") ? null : info?.image_url ?? null} load={loadSchoolPhoto} />
                </div>
                <div className="space-y-1 px-4 pt-3">
                  <h2 className="font-medium leading-snug text-ink">{school.name}</h2>
                  <p className="text-[13px] text-ink-3">{[school.city, school.state].filter(Boolean).join(", ") || "United States"}</p>
                  {domain ? <p className="font-mono text-[13px] text-ink-2">name@{domain}</p> : <p className="text-[13px] text-ink-3">No email domain on file</p>}
                </div>
              </Link>
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3">
                {info?.research_status === "done" ? <Badge tone="positive">{info.chapters_found} chapters · {info.emails_found} emails</Badge> : info?.research_status === "failed" ? <Badge tone="danger">Read failed</Badge> : info?.research_status === "running" ? <Badge tone="warning">Reading</Badge> : <Badge>Not gathered</Badge>}
                <form action={gatherUniversity.bind(null, school.id)}>
                  <SubmitButton size="sm" variant="secondary" pendingLabel="Reading the site" disabled={migrationMissing}>{info?.research_status === "done" ? "Gather again" : "Gather info"}</SubmitButton>
                </form>
              </div>
            </li>
          );
        })}
      </ul>
      {schools.length === 0 ? <p className="text-sm text-ink-3">No schools match.</p> : null}

      {q.length < 2 && pages > 1 ? (
        <nav className="flex items-center justify-between text-sm text-ink-2" aria-label="Pages">
          {page > 1 ? <Link href={hrefFor(page - 1, q, state)} className="hover:text-ink">Previous</Link> : <span />}
          <span>Page {page} of {pages}</span>
          {page < pages ? <Link href={hrefFor(page + 1, q, state)} className="hover:text-ink">Next</Link> : <span />}
        </nav>
      ) : null}
    </div>
  );
}
