import "server-only";
import { isGreekOrgName } from "@/lib/greek-orgs";
import { extractFindings, fraternityCountQuote, looksGreek, mergeFindings, pageAnchors, pageLinks, pageTitle, sameSchool, type Finding } from "@/lib/page-facts";

const UA = "GreekGeek/1.0 (+https://greekgeek.org)";

export type PageRead = { url: string; ok: boolean; title: string | null };

export type ResearchResult = {
  pages: PageRead[];
  findings: Finding[];
  error: string | null;
};

type Fetcher = (url: string, init: RequestInit) => Promise<Response>;

function rootDomain(domains: string[]): string | null {
  return domains.find((domain) => domain.endsWith(".edu")) ?? domains[0] ?? null;
}

async function readPage(url: string, fetchImpl: Fetcher, signal: AbortSignal): Promise<{ html: string; finalUrl: string } | null> {
  const response = await fetchImpl(url, {
    redirect: "follow",
    signal,
    headers: { "user-agent": UA, accept: "text/html" },
  });
  if (!response.ok) return null;
  const type = response.headers.get("content-type") ?? "";
  if (!/html|text\/plain/i.test(type)) return null;
  const length = Number(response.headers.get("content-length") ?? 0);
  if (length > 1_500_000) return null;
  const html = (await response.text()).slice(0, 1_500_000);
  return { html, finalUrl: response.url || url };
}

const SKIP_EMAIL = /^(noreply|no-reply|donotreply|do-not-reply|webmaster|postmaster|privacy|example|sentry|wix|wordpress)/i;

function canonical(href: string, domain: string): string | null {
  try {
    const url = new URL(href);
    if (url.protocol !== "https:" || !sameSchool(url.hostname, domain)) return null;
    if (/\.(pdf|jpe?g|png|gif|webp|zip|docx?|pptx?|xlsx?|mp4)$/i.test(url.pathname)) return null;
    url.hash = "";
    url.search = "";
    if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/$/, "");
    return url.href;
  } catch {
    return null;
  }
}

function linkScore(url: URL, text: string, fromGreek: boolean): number {
  if (url.hostname.startsWith("engage.")) return looksGreek(`${url.href} ${text}`) ? 50 : 0;
  if (looksGreek(`${url.href} ${text}`)) return 50;
  if (fromGreek && /\/(about|councils?|chapters?|contact|recruit|members?)(\/|$)/i.test(url.pathname)) return 40;
  if (/\/(student-life|campus-life|student-affairs|get-involved|involvement|organizations)(\/|$)/i.test(url.pathname)) return 20;
  if (/\/[^/]*a-z$/i.test(url.pathname) || /\/(?:atoz|a-to-z|directory)$/i.test(url.pathname)) return 18;
  if (url.hostname.startsWith("getinvolved.") || url.hostname.startsWith("fsl.")) return 20;
  return 0;
}

function directoryLetters(pageUrl: string, anchors: { href: string; text: string }[]): string[] {
  const base = new URL(pageUrl);
  const path = base.pathname.replace(/\/$/, "") || "/";
  if (!/\/[^/]*a-z$/i.test(path) && !/\/(?:atoz|a-to-z|directory)$/i.test(path)) return [];
  const letters: string[] = [];
  for (const anchor of anchors) {
    try {
      const url = new URL(anchor.href);
      const child = url.pathname.replace(/\/$/, "");
      if (url.hostname !== base.hostname || !child.startsWith(`${path}/`)) continue;
      if (child.slice(path.length + 1).includes("/")) continue;
      letters.push(url.href);
    } catch {
      continue;
    }
  }
  return [...new Set(letters)].slice(0, 30);
}

function schoolEmail(email: string, domains: string[]): boolean {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (!domain || SKIP_EMAIL.test(email.split("@")[0] ?? "")) return false;
  return domains.some((item) => domain === item || domain.endsWith(`.${item}`));
}

function personName(value: unknown, email: string): string | null {
  if (!value || typeof value !== "object") return null;
  const row = value as { firstName?: unknown; lastName?: unknown; primaryEmailAddress?: unknown };
  const contactEmail = typeof row.primaryEmailAddress === "string" ? row.primaryEmailAddress.trim().toLowerCase() : "";
  if (contactEmail !== email) return null;
  const first = typeof row.firstName === "string" ? row.firstName.trim() : "";
  const last = typeof row.lastName === "string" ? row.lastName.trim() : "";
  if (!/^[A-Za-z][A-Za-z.'-]{0,30}$/.test(first) || !/^[A-Za-z][A-Za-z.'-]{0,40}$/.test(last)) return null;
  return `${first} ${last}`;
}

function engageHosts(html: string, base: string, domain: string): string[] {
  const hosts = new Set<string>();
  for (const href of pageLinks(html, base)) {
    try {
      const url = new URL(href);
      if (url.protocol !== "https:" || !sameSchool(url.hostname, domain)) continue;
      if (url.hostname.startsWith("engage.")) hosts.add(url.origin);
    } catch {
      continue;
    }
  }
  return [...hosts];
}

function xmlLocs(xml: string): string[] {
  return [...xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/gi)].map((matched) => matched[1]);
}

async function readJson(url: string, domain: string, fetchImpl: Fetcher, signal: AbortSignal): Promise<unknown | null> {
  const response = await fetchImpl(url, { redirect: "follow", signal, headers: { "user-agent": UA, accept: "application/json" } });
  if (!response.ok) return null;
  let finalHost = "";
  try {
    finalHost = new URL(response.url || url).hostname;
  } catch {
    return null;
  }
  if (!sameSchool(finalHost, domain)) return null;
  const text = (await response.text()).slice(0, 1_500_000);
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return null;
  }
}

async function readEngage(origin: string, domain: string, domains: string[], fetchImpl: Fetcher, deadline: number): Promise<Finding[]> {
  const findings: Finding[] = [];
  const listed: { id: string; name: string; categories: string[]; summary: string; key: string }[] = [];
  for (let skip = 0; skip < 500 && Date.now() < deadline; skip += 100) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    let data: unknown = null;
    try {
      data = await readJson(`${origin}/api/discovery/search/organizations?top=100&skip=${skip}&query=`, domain, fetchImpl, controller.signal);
    } catch {
      data = null;
    } finally {
      clearTimeout(timer);
    }
    const value = data && typeof data === "object" && Array.isArray((data as { value?: unknown }).value) ? (data as { value: unknown[] }).value : [];
    for (const row of value) {
      if (!row || typeof row !== "object") continue;
      const item = row as { Id?: unknown; Name?: unknown; CategoryNames?: unknown; Status?: unknown; Visibility?: unknown; WebsiteKey?: unknown; Summary?: unknown };
      const categories = Array.isArray(item.CategoryNames) ? item.CategoryNames.filter((name): name is string => typeof name === "string") : [];
      const id = typeof item.Id === "string" || typeof item.Id === "number" ? String(item.Id) : "";
      const name = typeof item.Name === "string" ? item.Name.trim().slice(0, 160) : "";
      const greekCategory = categories.some((category) => looksGreek(category));
      if (item.Status !== "Active" || item.Visibility !== "Public" || !/^\d+$/.test(id) || name.length < 2) continue;
      if (categories.length > 0 && !greekCategory) continue;
      if (!greekCategory && !looksGreek(name) && !isGreekOrgName(name)) continue;
      const key = typeof item.WebsiteKey === "string" && /^[a-z0-9-]{1,80}$/i.test(item.WebsiteKey) ? item.WebsiteKey : id;
      listed.push({ id, name, categories, summary: typeof item.Summary === "string" ? item.Summary.trim().slice(0, 320) : "", key });
    }
    if (value.length < 100) break;
  }

  const chosen = listed.slice(0, 80);
  let index = 0;
  await Promise.all(Array.from({ length: Math.min(4, chosen.length) }, async () => {
    while (index < chosen.length && Date.now() < deadline) {
      const org = chosen[index++];
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 6_000);
      let detail: unknown = null;
      try {
        detail = await readJson(`${origin}/api/discovery/organization/${org.id}`, domain, fetchImpl, controller.signal);
      } catch {
        detail = null;
      } finally {
        clearTimeout(timer);
      }
      const row = detail && typeof detail === "object" ? detail as { email?: unknown; summary?: unknown; description?: unknown; primaryContact?: unknown; websiteKey?: unknown } : null;
      const summary = (typeof row?.summary === "string" && row.summary.trim()) || org.summary;
      const description = typeof row?.description === "string" ? row.description : "";
      const key = typeof row?.websiteKey === "string" && /^[a-z0-9-]{1,80}$/i.test(row.websiteKey) ? row.websiteKey : org.key;
      const source = `${origin}/organization/${key}`;
      const quote = [org.categories.join(", "), summary].filter(Boolean).join(". ").slice(0, 320);
      findings.push({ kind: "chapter", title: org.name, detail: org.categories.join(", ") || null, quote: quote || null, source_url: source });
      const about = `${summary} ${description}`;
      findings.push(...extractFindings(about, source, domains, true).filter((finding) => finding.kind !== "chapter" && finding.kind !== "email"));
      const email = typeof row?.email === "string" ? row.email.trim().toLowerCase() : "";
      if (!schoolEmail(email, domains)) continue;
      const name = personName(row?.primaryContact, email);
      findings.push({
        kind: "email",
        title: email,
        detail: `${name ? "Primary contact" : "Public contact"} · ${org.name}${name ? ` · ${name}` : ""}`,
        quote: quote || null,
        source_url: source,
      });
    }
  }));
  return findings;
}

async function sitemapGreek(origin: string, domain: string, fetchImpl: Fetcher, deadline: number): Promise<string[]> {
  const out: string[] = [];
  const queue = [`${origin}/sitemap.xml`];
  const seen = new Set<string>();
  while (queue.length > 0 && seen.size < 4 && Date.now() < deadline && out.length < 8) {
    const url = queue.shift();
    if (!url || seen.has(url)) continue;
    seen.add(url);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const response = await fetchImpl(url, { redirect: "follow", signal: controller.signal, headers: { "user-agent": UA, accept: "application/xml,text/xml" } });
      if (!response.ok) continue;
      const finalHost = new URL(response.url || url).hostname;
      if (!sameSchool(finalHost, domain)) continue;
      const xml = (await response.text()).slice(0, 1_500_000);
      for (const loc of xmlLocs(xml)) {
        let parsed: URL;
        try {
          parsed = new URL(loc);
        } catch {
          continue;
        }
        if (parsed.protocol !== "https:" || !sameSchool(parsed.hostname, domain)) continue;
        if (parsed.pathname.toLowerCase().endsWith(".xml") && seen.size + queue.length < 4) queue.push(parsed.href);
        else if (looksGreek(parsed.pathname)) out.push(parsed.href);
      }
    } catch {
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return out.slice(0, 8);
}

export async function readGreekLife(domains: string[], fetchImpl: Fetcher = fetch, budgetMs = 45_000): Promise<ResearchResult> {
  const domain = rootDomain(domains);
  if (!domain) return { pages: [], findings: [], error: "This school has no .edu domain on file, so there is no site to read." };
  const deadline = Date.now() + budgetMs;
  const pages: PageRead[] = [];
  const found: Finding[][] = [];
  const seen = new Set<string>();

  const take = async (url: string, greekPage: boolean): Promise<{ html: string; finalUrl: string } | null> => {
    const href = canonical(url, domain);
    if (!href || seen.has(href) || Date.now() > deadline) return null;
    seen.add(href);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const page = await readPage(href, fetchImpl, controller.signal);
      if (!page) {
        pages.push({ url: href, ok: false, title: null });
        return null;
      }
      const finalHost = new URL(page.finalUrl).hostname;
      if (!sameSchool(finalHost, domain)) {
        pages.push({ url: href, ok: false, title: null });
        return null;
      }
      pages.push({ url: page.finalUrl, ok: true, title: pageTitle(page.html) });
      found.push(extractFindings(page.html, page.finalUrl, domains, greekPage || looksGreek(page.finalUrl) || looksGreek(pageTitle(page.html) ?? "")));
      return page;
    } catch {
      pages.push({ url: href, ok: false, title: null });
      return null;
    } finally {
      clearTimeout(timer);
    }
  };

  const harvest = async (url: string): Promise<{ href: string; text: string }[]> => {
    const href = canonical(url, domain);
    if (!href || seen.has(href) || Date.now() > deadline) return [];
    seen.add(href);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 6_000);
    try {
      const page = await readPage(href, fetchImpl, controller.signal);
      if (!page) return [];
      if (!sameSchool(new URL(page.finalUrl).hostname, domain)) return [];
      return pageAnchors(page.html, page.finalUrl);
    } catch {
      return [];
    } finally {
      clearTimeout(timer);
    }
  };

  let home: { html: string; finalUrl: string } | null = null;
  for (const origin of [`https://www.${domain}`, `https://${domain}`]) {
    home = await take(origin, false);
    if (home) break;
  }
  if (!home) return { pages, findings: [], error: `Could not open the public site at ${domain}.` };
  const homeCount = fraternityCountQuote(home.html);
  if (homeCount) found.push([{ kind: "members", title: "Chapters", detail: null, quote: homeCount, source_url: home.finalUrl }]);

  const hosts = new Set(engageHosts(home.html, home.finalUrl, domain));
  const queued = new Set<string>(seen);
  const queue: { url: string; score: number; depth: number }[] = [];
  const consider = (href: string, text: string, depth: number, fromGreek: boolean) => {
    const key = canonical(href, domain);
    if (!key || queued.has(key) || depth > 4) return;
    let url: URL;
    try {
      url = new URL(key);
    } catch {
      return;
    }
    const score = linkScore(url, text, fromGreek);
    if (score <= 0) return;
    queued.add(key);
    queue.push({ url: key, score, depth });
  };
  for (const anchor of pageAnchors(home.html, home.finalUrl)) consider(anchor.href, anchor.text, 1, false);
  for (const loc of await sitemapGreek(new URL(home.finalUrl).origin, domain, fetchImpl, deadline)) consider(loc, "", 1, false);

  let opened = 0;
  while (queue.length > 0 && opened < 14 && Date.now() < deadline) {
    queue.sort((a, b) => b.score - a.score);
    const batch = queue.splice(0, 4);
    const read = await Promise.all(batch.map(async (job) => ({ job, page: await take(job.url, job.score >= 50) })));
    opened += batch.length;
    for (const { job, page } of read) {
      if (!page) continue;
      for (const host of engageHosts(page.html, page.finalUrl, domain)) hosts.add(host);
      const count = fraternityCountQuote(page.html);
      if (count) found.push([{ kind: "members", title: "Chapters", detail: null, quote: count, source_url: page.finalUrl }]);
      const fromGreek = job.score >= 50 || looksGreek(page.finalUrl) || looksGreek(pageTitle(page.html) ?? "");
      const anchors = pageAnchors(page.html, page.finalUrl);
      const letters = job.depth <= 2 ? directoryLetters(page.finalUrl, anchors) : [];
      for (let i = 0; i < letters.length && Date.now() < deadline; i += 6) {
        const lists = await Promise.all(letters.slice(i, i + 6).map((letter) => harvest(letter)));
        for (const list of lists) for (const anchor of list) consider(anchor.href, anchor.text, job.depth + 1, false);
      }
      for (const anchor of anchors) consider(anchor.href, anchor.text, job.depth + 1, fromGreek);
    }
  }

  for (const origin of [...hosts].slice(0, 1)) {
    if (Date.now() > deadline) break;
    try {
      const extra = await readEngage(origin, domain, domains, fetchImpl, deadline);
      if (extra.length > 0) {
        found.push(extra);
        pages.push({ url: `${origin}/organizations`, ok: true, title: "Organization directory" });
      }
    } catch {
      continue;
    }
  }

  const findings = mergeFindings(found);
  const unique = new Map<string, PageRead>();
  for (const page of pages) {
    const existing = unique.get(page.url);
    if (!existing || (!existing.ok && page.ok)) unique.set(page.url, page);
  }
  return {
    pages: [...unique.values()].slice(0, 30),
    findings,
    error: findings.length === 0 ? "The site opened, but its public pages did not list chapters, dues, housing, or a Greek life email." : null,
  };
}
