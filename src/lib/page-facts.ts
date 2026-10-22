import { GREEK_ORGS } from "@/lib/greek-orgs";

export type Finding = {
  kind: "chapter" | "dues" | "members" | "housing" | "national" | "email";
  title: string;
  detail: string | null;
  quote: string | null;
  source_url: string;
};

const SKIP_EMAIL = /^(noreply|no-reply|donotreply|do-not-reply|postmaster|privacy|example|sentry|wix|wordpress|abuse|security)|webmaster/i;

export const PERSONAL_DOMAINS = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "me.com", "live.com", "aol.com", "protonmail.com"]);

const EMAIL = /^[a-z0-9][a-z0-9._%+-]{0,64}@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}$/;

const OFF_TOPIC = /^(ithelp|helpdesk|help|support|techsupport|it|ows|registrar|admissions?|finaid|financialaid|bursar|parking|police|titleix|accessibility|ada|careers?|jobs|hr|payroll|library|news|media|marketing|web|webteam)$/i;

export function usableEmail(email: string): boolean {
  const [local = "", domain = ""] = email.split("@");
  return EMAIL.test(email) && !SKIP_EMAIL.test(local) && !OFF_TOPIC.test(local) && !/(^|\.)lists\./i.test(domain) && !/-l$/i.test(local) && !/\.(png|jpe?g|gif|webp|svg)$/i.test(email);
}

function decodeCloudflare(hex: string): string | null {
  if (!/^[0-9a-f]{4,}$/i.test(hex) || hex.length % 2 !== 0) return null;
  const key = parseInt(hex.slice(0, 2), 16);
  let out = "";
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key);
  return out;
}

type EmailHit = { email: string; before: string; after: string; label: string | null };

export function emailsIn(html: string): EmailHit[] {
  const hits: EmailHit[] = [];
  const context = (start: number, end: number, label: string | null) => ({
    before: htmlToText(html.slice(Math.max(0, start - 2000), start)).slice(-240),
    after: htmlToText(html.slice(end, end + 800)).slice(0, 200),
    label,
  });
  const add = (raw: string, start: number, end: number, label: string | null) => {
    const email = raw.trim().toLowerCase().replace(/^mailto:/, "").replace(/[).,;:'"]+$/, "");
    if (usableEmail(email)) hits.push({ email, ...context(start, end, label) });
  };

  const mailto = /<a\b[^>]*\bhref\s*=\s*["']\s*mailto:([^"'?]+)[^"']*["'][^>]*>([\s\S]*?)<\/a>/gi;
  for (const matched of html.matchAll(mailto)) {
    let email = matched[1];
    try {
      email = decodeURIComponent(email);
    } catch {
      continue;
    }
    const label = htmlToText(matched[2]).slice(0, 120) || null;
    add(email.split(",")[0], matched.index, matched.index + matched[0].length, label);
  }

  const protectedEmail = /(?:data-cfemail\s*=\s*["']([0-9a-f]+)["']|\/cdn-cgi\/l\/email-protection#([0-9a-f]+))/gi;
  for (const matched of html.matchAll(protectedEmail)) {
    const decoded = decodeCloudflare(matched[1] ?? matched[2]);
    if (decoded) add(decoded, matched.index, matched.index + matched[0].length, null);
  }

  const stripped = html.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, (block) => " ".repeat(block.length));
  const plain = /[a-z0-9][a-z0-9._%+-]{0,64}(?:@|&#0*64;|&#x0*40;)[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;
  for (const matched of stripped.matchAll(plain)) {
    add(matched[0].replace(/&#0*64;|&#x0*40;/i, "@"), matched.index, matched.index + matched[0].length, null);
  }

  const spelled = /([a-z0-9][a-z0-9._%+-]{0,64})\s*[[(]\s*at\s*[\])]\s*([a-z0-9-]+(?:\s*(?:\.|[[(]\s*dot\s*[\])])\s*[a-z0-9-]+)+)/gi;
  for (const matched of stripped.matchAll(spelled)) {
    const domain = matched[2].replace(/\s*[[(]\s*dot\s*[\])]\s*/gi, ".").replace(/\s+/g, "");
    add(`${matched[1]}@${domain}`, matched.index, matched.index + matched[0].length, null);
  }

  return hits;
}

const NOT_NAME = new Set([
  "fraternity", "sorority", "greek", "life", "office", "council", "university", "college", "student", "students", "affairs", "director", "assistant",
  "associate", "coordinator", "advisor", "adviser", "president", "vice", "dean", "contact", "email", "phone", "panhellenic", "interfraternity",
  "national", "multicultural", "chapter", "chapters", "housing", "recruitment", "center", "campus", "program", "programs", "services", "leadership",
  "involvement", "department", "hall", "room", "suite", "staff", "team", "graduate", "senior", "executive", "board", "relations", "community",
  "alpha", "beta", "gamma", "delta", "epsilon", "zeta", "eta", "theta", "iota", "kappa", "lambda", "mu", "nu", "xi", "omicron", "pi", "rho",
  "sigma", "tau", "upsilon", "phi", "chi", "psi", "omega", "the", "and", "for", "of", "our", "meet", "about", "more", "read", "learn", "click",
  "chair", "treasurer", "secretary", "committee", "social", "member", "members", "educator", "educators", "new", "help", "password", "family",
  "alumni", "chief", "justice", "risk", "management", "finance", "records", "programming", "public", "outreach", "engagement", "inclusion",
  "philanthropy", "service", "scholarship", "development", "relations", "communications", "membership", "standards", "conduct", "office",
]);

function nameFor(email: string, hit: EmailHit): string | null {
  const local = email.split("@")[0].toLowerCase().replace(/[^a-z]/g, "");
  const candidates = [hit.label ?? "", hit.before.slice(-140), hit.after.slice(0, 60)];
  for (const source of candidates) {
    const names = [...source.matchAll(/\b(?=([A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?)\s+(?:[A-Z]\.\s+)?([A-Z][a-z]+(?:[-'][A-Z]?[a-z]+)?)\b)/g)].reverse();
    for (const matched of names) {
      const [first, last] = [matched[1], matched[2]];
      if (NOT_NAME.has(first.toLowerCase()) || NOT_NAME.has(last.toLowerCase())) continue;
      const firstKey = first.toLowerCase().replace(/[^a-z]/g, "");
      const lastKey = last.toLowerCase().replace(/[^a-z]/g, "");
      if (local.includes(lastKey.slice(0, 4)) || local.includes(firstKey.slice(0, 4)) || local.startsWith(`${firstKey[0]}${lastKey.slice(0, 3)}`)) return `${first} ${last}`;
    }
  }
  return null;
}

const LETTER = "(?:Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta|Iota|Kappa|Lambda|Mu|Nu|Xi|Omicron|Pi|Rho|Sigma|Tau|Upsilon|Phi|Chi|Psi|Omega)";
const LETTERS_TAIL = new RegExp(`\\b(${LETTER}(?:\\s+${LETTER}){1,3}(?:\\s+(?:Fraternity|Sorority|Sinfonia|Colony|Chapter|Inc\\.?)){0,2})(?:\\s+(?:Email|E-mail|Contact))?[\\s:,-]*$`);

function lettersBefore(before: string): string | null {
  const tail = before.replace(/\s+/g, " ").trimEnd().slice(-80);
  const matched = tail.match(LETTERS_TAIL);
  if (!matched) return null;
  return matched[1].trim().slice(0, 120);
}

function councilFromEmail(email: string): string | null {
  const local = email.split("@")[0].toLowerCase().replace(/^(tcu|ua|mizzou|uga|lsu|osu|psu)/, "");
  if (/^ifc/.test(local)) return "IFC";
  if (/^(panhel|pha|apa|cpc|phc)/.test(local)) return "Panhellenic";
  if (/^nphc|nphc$/.test(local)) return "NPHC";
  if (/^(mgc|ugc|mcgc)/.test(local)) return "MGC";
  return null;
}

function councilFromText(text: string): string | null {
  const value = text.toLowerCase();
  if (/\bifc\b|interfraternity/.test(value)) return "IFC";
  if (/national pan-?hellenic|\bnphc\b/.test(value)) return "NPHC";
  if (/panhel|\bcpc\b|\bapa\b/.test(value)) return "Panhellenic";
  if (/\bmgc\b|\bugc\b|multicultural greek|united greek/.test(value)) return "MGC";
  return null;
}

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
    .replace(/&#x([0-9a-f]+);/gi, (_, n: string) => String.fromCharCode(parseInt(n, 16)))
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

const ROLES: [RegExp, string][] = [
  [/vice president|\bvp\b/g, "Vice President"],
  [/(?<!vice[\s-])president/g, "President"],
  [/assistant dean|associate dean|\bdean\b/g, "Dean"],
  [/assistant director|associate director/g, "Assistant Director"],
  [/(?<!(?:assistant|associate) )director/g, "Director"],
  [/coordinator/g, "Coordinator"],
  [/advis[oe]r/g, "Advisor"],
  [/graduate assistant|\bga\b/g, "Graduate Assistant"],
  [/recruitment|\brush\b/g, "Recruitment"],
  [/treasurer/g, "Treasurer"],
  [/secretary/g, "Secretary"],
  [/specialist/g, "Specialist"],
  [/\bchair\b/g, "Chair"],
];

function roleNear(text: string): string {
  const value = text.toLowerCase();
  let best: { at: number; role: string } | null = null;
  for (const [pattern, role] of ROLES) {
    for (const matched of value.matchAll(pattern)) {
      if (!best || matched.index > best.at) best = { at: matched.index, role };
    }
  }
  return best?.role ?? "Greek life office";
}

function orgNear(text: string): string | null {
  const lower = text.toLowerCase();
  let best: { end: number; name: string } | null = null;
  for (const name of GREEK_ORGS) {
    const at = lower.lastIndexOf(name.toLowerCase());
    if (at === -1) continue;
    const end = at + name.length;
    if (!best || end > best.end || (end === best.end && name.length > best.name.length)) best = { end, name };
  }
  return best?.name ?? null;
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

  const emails = new Set<string>();
  for (const hit of emailsIn(html)) {
    if (emails.has(hit.email)) continue;
    const domain = hit.email.split("@")[1] ?? "";
    const label = hit.label && !hit.label.includes("@") ? hit.label : "";
    const near = `${hit.before.slice(-160)} ${label}`;
    const around = `${hit.before.slice(-140)} ${label} ${hit.after.slice(0, 120)}`.replace(/\s+/g, " ").trim();
    const school = domains.some((item) => domain === item || domain.endsWith(`.${item}`));
    const letters = lettersBefore(`${hit.before} ${label}`);
    const chapter = letters ?? orgNear(near) ?? orgNear(around);
    if (!school && !(PERSONAL_DOMAINS.has(domain) && greekPage && chapter)) continue;
    if (!greekPage && !looksGreek(around)) continue;
    emails.add(hit.email);
    const name = nameFor(hit.email, hit);
    const organization = letters ?? councilFromEmail(hit.email) ?? chapter ?? councilFromText(near) ?? "Greek life";
    push({
      kind: "email",
      title: hit.email,
      detail: [roleNear(hit.before.slice(-100) || around), organization, name].filter(Boolean).join(" · "),
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
