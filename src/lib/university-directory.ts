import "server-only";

const SOURCE = "https://raw.githubusercontent.com/Hipo/university-domains-list/master/world_universities_and_domains.json";
const TTL = 24 * 60 * 60_000;

const STATES: Record<string, string> = {
  alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR", california: "CA", colorado: "CO", connecticut: "CT",
  delaware: "DE", "district of columbia": "DC", florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID", illinois: "IL",
  indiana: "IN", iowa: "IA", kansas: "KS", kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
  massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS", missouri: "MO", montana: "MT",
  nebraska: "NE", nevada: "NV", "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM", "new york": "NY",
  "north carolina": "NC", "north dakota": "ND", ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
  "puerto rico": "PR", "rhode island": "RI", "south carolina": "SC", "south dakota": "SD", tennessee: "TN", texas: "TX",
  utah: "UT", vermont: "VT", virginia: "VA", washington: "WA", "west virginia": "WV", wisconsin: "WI", wyoming: "WY",
};
const CODES = new Set(Object.values(STATES));
const STOPWORDS = new Set(["of", "the", "at", "and", "in", "for"]);

export type DirectoryUniversity = { name: string; slug: string; state: string | null; email_domains: string[] };

type Raw = { name?: unknown; country?: unknown; domains?: unknown; "state-province"?: unknown };

let cache: { at: number; list: DirectoryUniversity[] } | null = null;
let inflight: Promise<DirectoryUniversity[]> | null = null;

function stateCode(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const v = value.trim();
  if (CODES.has(v.toUpperCase())) return v.toUpperCase();
  return STATES[v.toLowerCase()] ?? null;
}

export function universitySlug(name: string): string {
  const base = name.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return (base.length >= 2 ? base : `university-${base}`).slice(0, 80).replace(/-+$/, "");
}

function normalize(text: string): string {
  return text.toLowerCase().normalize("NFKD").replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();
}

async function load(): Promise<DirectoryUniversity[]> {
  const res = await fetch(SOURCE, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`university directory returned ${res.status}`);
  const raw = (await res.json()) as Raw[];
  const seen = new Set<string>();
  const list: DirectoryUniversity[] = [];
  for (const r of raw) {
    if (r.country !== "United States" || typeof r.name !== "string") continue;
    const name = r.name.trim().slice(0, 200);
    const slug = universitySlug(name);
    if (name.length < 2 || seen.has(slug)) continue;
    seen.add(slug);
    const domains = Array.isArray(r.domains)
      ? r.domains.filter((d): d is string => typeof d === "string" && /^[a-z0-9.-]+\.[a-z]{2,}$/i.test(d)).map((d) => d.toLowerCase())
      : [];
    list.push({ name, slug, state: stateCode(r["state-province"]), email_domains: [...new Set(domains)] });
  }
  return list;
}

async function directory(now: number): Promise<DirectoryUniversity[]> {
  if (cache && now - cache.at < TTL) return cache.list;
  inflight ??= load()
    .then((list) => {
      cache = { at: now, list };
      return list;
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export async function searchUniversityDirectory(query: string, limit: number, now: number): Promise<DirectoryUniversity[]> {
  const q = normalize(query);
  if (q.length < 2) return [];
  let list: DirectoryUniversity[];
  try {
    list = await directory(now);
  } catch {
    return cache?.list ? rank(cache.list, q, limit, query.trim().toLowerCase().replace(/^@/, "")) : [];
  }
  return rank(list, q, limit, query.trim().toLowerCase().replace(/^@/, ""));
}

function rank(list: DirectoryUniversity[], q: string, limit: number, domainQuery = q.replace(/ /g, "")): DirectoryUniversity[] {
  const words = q.split(" ");
  const tokens = words.filter((t) => !STOPWORDS.has(t)).length ? words.filter((t) => !STOPWORDS.has(t)) : words;
  const scored: Array<{ u: DirectoryUniversity; score: number }> = [];
  for (const u of list) {
    const name = normalize(u.name);
    const domainHit = u.email_domains.some((d) => d === domainQuery || d.split(".")[0] === domainQuery || d.startsWith(`${domainQuery}.`));
    if (!domainHit && !tokens.every((t) => name.includes(t))) continue;
    let score = 0;
    if (name === q) score += 100;
    if (name.startsWith(q)) score += 40;
    if (domainHit) score += 60;
    if (` ${name} `.includes(` ${q} `)) score += 20;
    score -= name.length / 100;
    scored.push({ u, score });
  }
  return scored.sort((a, b) => b.score - a.score).slice(0, limit).map((s) => s.u);
}
