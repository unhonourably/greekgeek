"use server";

import { headers } from "next/headers";
import { z } from "zod";
import type { ActionState } from "@/lib/action-state";
import { getMyProfile, requireUser } from "@/lib/auth";
import { sendEmail } from "@/lib/email";
import { renderEmailHtml } from "@/lib/email-template";
import { serverEnv } from "@/lib/env";
import { zodState } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";

const ADMIN = "admin@greekgeek.org";

const messageSchema = z.string().trim().min(10, "Describe what went wrong").max(4000);

export async function reportBug(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser();
  const parsed = messageSchema.safeParse(formData.get("message"));
  if (!parsed.success) return zodState(parsed.error);
  if (!rateLimit(`bug:${user.id}`, 5, 60 * 60_000)) return { error: "You have sent several reports. Try again later." };
  const profile = await getMyProfile();
  const name = profile?.full_name || profile?.display_name || user.email || "A member";
  const rawPage = String(formData.get("page") ?? "");
  const page = rawPage.startsWith("/") && !rawPage.startsWith("//") ? rawPage.slice(0, 300) : "Unknown page";
  const agent = ((await headers()).get("user-agent") ?? "").slice(0, 300);
  const paragraphs = [`${name} (${user.email}) reported a bug.`, parsed.data, `Page: ${page}`, agent ? `Browser: ${agent}` : ""].filter(Boolean);
  try {
    const result = await sendEmail({
      to: ADMIN,
      replyTo: user.email || undefined,
      subject: `Bug report from ${name}`,
      text: paragraphs.join("\n\n"),
      html: renderEmailHtml({
        appUrl: serverEnv.appUrl(),
        preheader: `${name} reported a bug.`,
        heading: "Bug report",
        paragraphs,
        note: user.email ? `Reply to ${user.email} to follow up.` : null,
      }),
    });
    if (!result.delivered) return { ok: true, message: `Email delivery is not turned on here. Write ${ADMIN} directly.` };
  } catch {
    return { error: "The report could not be sent. Try again." };
  }
  return { ok: true, message: "Sent. We will follow up by email." };
}
