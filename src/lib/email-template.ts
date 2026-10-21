import { brand } from "@/config/brand";

export type EmailContent = {
  preheader: string;
  heading: string;
  greeting?: string | null;
  paragraphs: string[];
  action?: { label: string; url: string } | null;
  note?: string | null;
  footer?: string | null;
  appUrl: string;
};

const C = {
  canvas: "#000000",
  card: "#0f0f0f",
  line: "#262626",
  ink: "#f4ece0",
  ink2: "#bdb5a8",
  ink3: "#8a8378",
  accent: "#e0a535",
  onAccent: "#0a0a0a",
};

const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const SERIF = "Georgia,'Times New Roman',serif";

export function escapeHtml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function safeUrl(url: string): string {
  return /^https?:\/\//i.test(url) ? escapeHtml(url) : "#";
}

function wordmark(appUrl: string): string {
  if (/^https:\/\//i.test(appUrl)) {
    return `<img src="${escapeHtml(`${appUrl}${brand.logo.src}`)}" width="150" alt="${escapeHtml(brand.name)}" style="display:block;width:150px;max-width:150px;height:auto;border:0;outline:none;text-decoration:none;color:${C.ink};font-family:${SERIF};font-size:24px;font-weight:600;" />`;
  }
  return `<span style="font-family:${SERIF};font-size:26px;font-weight:600;letter-spacing:-0.3px;color:${C.ink};">Gr<span style="color:${C.accent};">&epsilon;&epsilon;</span>kGee<span style="color:${C.accent};">&kappa;</span></span>`;
}

export function renderEmailHtml(content: EmailContent): string {
  const action = content.action && /^https?:\/\//i.test(content.action.url)
    ? `<tr><td style="padding:8px 0 4px 0;">
        <table role="presentation" cellspacing="0" cellpadding="0" border="0"><tr>
          <td bgcolor="${C.accent}" style="border-radius:10px;">
            <a href="${safeUrl(content.action.url)}" target="_blank" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${C.onAccent};text-decoration:none;border-radius:10px;">${escapeHtml(content.action.label)}</a>
          </td>
        </tr></table>
      </td></tr>
      <tr><td style="padding:18px 0 0 0;font-family:${FONT};font-size:12px;line-height:18px;color:${C.ink3};">
        If the button doesn't work, paste this link into your browser:<br />
        <a href="${safeUrl(content.action.url)}" target="_blank" style="color:${C.accent};text-decoration:underline;word-break:break-all;">${escapeHtml(content.action.url)}</a>
      </td></tr>`
    : "";
  const paragraphs = content.paragraphs
    .map((p) => `<tr><td style="padding:0 0 16px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink2};">${escapeHtml(p).replace(/\n/g, "<br />")}</td></tr>`)
    .join("");
  const note = content.note
    ? `<tr><td style="padding:24px 0 0 0;"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
        <td style="border-top:1px solid ${C.line};padding:16px 0 0 0;font-family:${FONT};font-size:13px;line-height:20px;color:${C.ink3};">${escapeHtml(content.note)}</td>
      </tr></table></td></tr>`
    : "";
  return `<!doctype html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<meta name="color-scheme" content="dark" />
<meta name="supported-color-schemes" content="dark" />
<title>${escapeHtml(content.heading)}</title>
<style>
  @media (max-width: 620px) { .gg-card { padding: 28px 22px !important; } .gg-outer { padding: 20px 12px !important; } }
  a { color: ${C.accent}; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.canvas};" bgcolor="${C.canvas}">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;mso-hide:all;">${escapeHtml(content.preheader)}&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;</div>
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" bgcolor="${C.canvas}" style="background:${C.canvas};">
  <tr><td align="center" class="gg-outer" style="padding:40px 16px;">
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;">
      <tr><td style="padding:0 4px 24px 4px;">
        <a href="${safeUrl(content.appUrl)}" target="_blank" style="text-decoration:none;">${wordmark(content.appUrl)}</a>
      </td></tr>
      <tr><td class="gg-card" bgcolor="${C.card}" style="background:${C.card};border:1px solid ${C.line};border-radius:16px;padding:36px 36px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
          <tr><td style="padding:0 0 4px 0;"><div style="width:36px;height:3px;background:${C.accent};border-radius:2px;font-size:0;line-height:0;">&nbsp;</div></td></tr>
          <tr><td style="padding:16px 0 18px 0;font-family:${SERIF};font-size:24px;line-height:32px;font-weight:600;color:${C.ink};">${escapeHtml(content.heading)}</td></tr>
          ${content.greeting ? `<tr><td style="padding:0 0 12px 0;font-family:${FONT};font-size:15px;line-height:24px;color:${C.ink};">${escapeHtml(content.greeting)}</td></tr>` : ""}
          ${paragraphs}
          ${action}
          ${note}
        </table>
      </td></tr>
      <tr><td style="padding:24px 8px 0 8px;font-family:${FONT};font-size:12px;line-height:18px;color:${C.ink3};" align="center">
        ${content.footer ? `${escapeHtml(content.footer)}<br />` : ""}
        Sent by ${escapeHtml(brand.name)} &middot; <a href="${safeUrl(content.appUrl)}" target="_blank" style="color:${C.ink3};text-decoration:underline;">${escapeHtml(content.appUrl.replace(/^https?:\/\//, ""))}</a>
      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
