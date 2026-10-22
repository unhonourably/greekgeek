import { GREEK_ORGS } from "@/lib/greek-orgs";

export type Finding = {
  kind: "chapter" | "dues" | "members" | "housing" | "national" | "email";
  title: string;
  detail: string | null;
  quote: string | null;
  source_url: string;
};

const SKIP_EMAIL = /^(noreply|no-reply|donotreply|do-not-reply|webmaster|postmaster|privacy|example|sentry|wix|wordpress)/i;

export function htmlToText(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&rsquo;|&#8217;|&lsquo;/gi, "'")
    .replace(/&rdquo;|&ldquo;/gi, "\"")
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n: string) => String.fromCharCode(Number(n)))
    .replace(/\s+/g, " ")
    .trim();
}

export function pageTitle(html: string): string | null {
  const matched = html.match(/<title[^>]*>([^<]{2,180})<\/title>/i);
  return matched ? htmlToText(matched[1]).slice(0, 180) : null;
}

export function pageAnchors(html: string, base: string): { href: string; text: string }[] {
  const out: { href: string; text: string }[] = [];
  const re = /<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let matched: RegExpExecArray | null;
  while ((matched = re.exec(html))) {
    try {
      const url = new URL(matched[1], base);
      if (url.protocol !== "https:" && url.protocol !== "http:") continue;
      url.hash = "";
      out.push({ href: url.href, text: htmlToText(matched[2]).slice(0, 180) });
    } catch {
      continue;
    }
  }
  return out;
}

export function pageLinks(html: string, base: string): string[] {
  return pageAnchors(html, base).map((anchor) => anchor.href);
}

export function fraternityCountQuote(html: string): string | null {
  const matched = htmlToText(html).match(/\b\d{1,4}\+?\s+fraternit(?:y|ies)(?:\s+and\s+sororit(?:y|ies))?/i);
  return matched ? matched[0] : null;
}

export function sameSchool(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const root = domain.toLowerCase().replace(/^\.+/, "");
  if (!root || /^\d/.test(host) || host === "localhost" || host.endsWith(".local")) return false;
  return host === root || host.endsWith(`.${root}`);
}

export function looksGreek(value: string): boolean {
  return /greek|fratern|soror|pan-?hellenic|\bifc\b|\bnphc\b|\bfsl\b/i.test(value);
}

function windowAround(text: string, index: number, radius = 140): string {
  return text.slice(Math.max(0, index - radius), Math.min(text.length, index + radius)).replace(/\s+/g, " ").trim();
}

function sentenceAt(text: string, index: number): string {
  const start = Math.max(text.lastIndexOf(". ", index), text.lastIndexOf("! ", index), text.lastIndexOf("? ", index));
  const from = start === -1 ? 0 : start + 2;
  let end = text.length;
  for (const mark of [". ", "! ", "? "]) {
    const at = text.indexOf(mark, index);
    if (at !== -1) end = Math.min(end, at + 1);
  }
  return text.slice(from, end).trim().slice(0, 320);
}

function roleNear(text: string): string {
  const value = text.toLowerCase();
  if (value.includes("president")) return "President";
  if (value.includes("advisor") || value.includes("adviser")) return "Advisor";
  if (value.includes("director")) return "Director";
  if (value.includes("coordinator")) return "Coordinator";
  if (value.includes("recruitment") || value.includes("rush")) return "Recruitment";
  return "Greek life office";
}

function orgNear(text: string): string | null {
  const lower = text.toLowerCase();
  return GREEK_ORGS.find((name) => lower.includes(name.toLowerCase())) ?? null;
}

export function extractFindings(html: string, sourceUrl: string, domains: string[], greekPage: boolean): Finding[] {
  const text = htmlToText(html);
  const lower = text.toLowerCase();
  const findings: Finding[] = [];
  const seen = new Set<string>();
  const push = (finding: Finding) => {
    const key = `${finding.kind}:${finding.title.toLowerCase()}:${(finding.quote ?? "").toLowerCase()}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push(finding);
  };

  if (greekPage) {
    for (const name of GREEK_ORGS) {
      const at = lower.indexOf(name.toLowerCase());
      if (at === -1) continue;
      push({ kind: "chapter", title: name, detail: null, quote: windowAround(text, at, 90), source_url: sourceUrl });
    }
  }

  const emailRe = /[a-z0-9][a-z0-9._%+-]{0,64}@[a-z0-9.-]+\.[a-z]{2,}/gi;
  let emailMatch: RegExpExecArray | null;
  while ((emailMatch = emailRe.exec(text))) {
    const email = emailMatch[0].toLowerCase().replace(/[).,;:]+$/, "");
    const domain = email.split("@")[1] ?? "";
    if (!domains.some((item) => domain === item || domain.endsWith(`.${item}`))) continue;
    if (SKIP_EMAIL.test(email.split("@")[0])) continue;
    const around = windowAround(text, emailMatch.index);
    if (!greekPage && !looksGreek(around)) continue;
    push({
      kind: "email",
      title: email,
      detail: `${roleNear(around)} · ${orgNear(around) ?? "Greek life"}`,
      quote: around.slice(0, 240),
      source_url: sourceUrl,
    });
  }

  if (greekPage) {
    const parts = text.split(/(?<=[.!?])\s+/);
    for (const sentence of parts) {
      const line = sentence.trim();
      if (line.length < 30 || line.length > 320 || !/\d/.test(line)) continue;
      const value = line.toLowerCase();
      let kind: Finding["kind"] | null = null;
      if (/\bdues\b/.test(value) && /\$\s?\d|\d+\s*per\s+(semester|term|year|month)/.test(value)) kind = "dues";
      else if (/in-house|out of house|out-of-house|live-in|housed|chapter house|\bbeds?\b/.test(value)) kind = "housing";
      else if (/\bchapters?\b/.test(value) && /national|nationwide|international|across the (country|nation)/.test(value)) kind = "national";
      else if (/\b\d{1,6}\b[^.]{0,40}\b(members|membership|undergraduates|chapter size|colony)\b/.test(value) || /\b(members|membership|chapter size|colony)\b[^.]{0,40}\b\d{1,6}\b/.test(value)) kind = "members";
      if (!kind) continue;
      const org = orgNear(line);
      const focused = line.length > 160 ? (line.match(/.{0,50}\d[\d,+.]*\s+\S+(?:\s+\S+){0,6}/)?.[0] ?? line.slice(0, 160)).trim() : line;
      push({ kind, title: org ?? (kind === "dues" ? "Dues" : kind === "housing" ? "Housing" : kind === "national" ? "National size" : "Membership"), detail: null, quote: focused, source_url: sourceUrl });
    }
  }

  return findings;
}

export function mergeFindings(groups: Finding[][]): Finding[] {
  const merged: Finding[] = [];
  const seen = new Set<string>();
  for (const finding of groups.flat()) {
    const key = finding.kind === "chapter" || finding.kind === "email"
      ? `${finding.kind}:${finding.title.toLowerCase()}`
      : `${finding.kind}:${(finding.quote ?? "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(finding);
  }
  return merged.slice(0, 160);
}
