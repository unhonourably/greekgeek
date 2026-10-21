import "server-only";
import { safeEqual } from "@/lib/crypto";
import { sendEmail } from "@/lib/email";
import { serverEnv } from "@/lib/env";
import { adminRpc } from "@/lib/supabase/admin";

export function isAuthorizedCron(header: string | null): boolean {
  let secret: string;
  try {
    secret = serverEnv.cronSecret();
  } catch {
    return false;
  }
  if (secret.length < 16 || !header?.startsWith("Bearer ")) return false;
  return safeEqual(header.slice(7), secret);
}

type Claimed = { id: string; email: string | null; title: string; body: string | null; link: string | null };

export function notificationEmail(n: Pick<Claimed, "title" | "body" | "link">, appUrl: string): { subject: string; text: string } {
  const link = n.link && n.link.startsWith("/") && !n.link.startsWith("//") ? `${appUrl}${n.link}` : null;
  const parts = [n.title, n.body, link ? `Open: ${link}` : null, `Manage email preferences: ${appUrl}/account#notifications`];
  return { subject: n.title, text: parts.filter(Boolean).join("\n\n") };
}

async function sendNotificationEmails(): Promise<Record<string, number>> {
  const rpc = adminRpc();
  const appUrl = serverEnv.appUrl();
  const batch = await rpc<Claimed[]>("service_claim_notification_emails", { p_limit: 50 });
  let sent = 0;
  let failed = 0;
  for (const n of batch ?? []) {
    try {
      if (!n.email) throw new Error("No email address on file");
      await sendEmail({ to: n.email, ...notificationEmail(n, appUrl) });
      await rpc("service_complete_notification_email", { p_id: n.id, p_ok: true, p_error: null });
      sent += 1;
    } catch (e) {
      await rpc("service_complete_notification_email", { p_id: n.id, p_ok: false, p_error: e instanceof Error ? e.message : "send failed" });
      failed += 1;
    }
  }
  return { claimed: batch?.length ?? 0, sent, failed };
}

export const JOBS = {
  "notification-emails": sendNotificationEmails,
  "late-fees": async () => ({ applied: await adminRpc()<number>("service_apply_late_fees") }),
  "dues-reminders": async () => ({ queued: await adminRpc()<number>("service_dues_reminders") }),
  "event-reminders": async () => ({ queued: await adminRpc()<number>("service_event_reminders") }),
  "recruitment-followups": async () => ({ queued: await adminRpc()<number>("service_recruitment_followups") }),
} as const satisfies Record<string, () => Promise<Record<string, number>>>;

export type JobName = keyof typeof JOBS;

export function isJobName(value: string): value is JobName {
  return Object.hasOwn(JOBS, value);
}
