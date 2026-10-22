import "server-only";
import { serverEnv } from "@/lib/env";

export type OutgoingEmail = {
  to: string;
  from?: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
  idempotencyKey?: string;
  headers?: Record<string, string>;
};

export class EmailNotConfiguredError extends Error {
  constructor() {
    super("Email delivery is not configured");
    this.name = "EmailNotConfiguredError";
  }
}

export async function sendEmail(message: OutgoingEmail): Promise<{ id: string | null; delivered: boolean }> {
  const apiKey = serverEnv.resendApiKey();
  if (!apiKey) {
    if (serverEnv.isProduction()) throw new EmailNotConfiguredError();
    console.info(`[email:dev] to=${message.to} subject=${JSON.stringify(message.subject)}\n${message.text}`);
    return { id: null, delivered: false };
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(message.idempotencyKey ? { "Idempotency-Key": message.idempotencyKey } : {}),
    },
    body: JSON.stringify({
      from: message.from ?? serverEnv.emailFrom(),
      to: [message.to],
      subject: message.subject,
      text: message.text,
      ...(message.html ? { html: message.html } : {}),
      ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      ...(message.headers ? { headers: message.headers } : {}),
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Email provider responded ${response.status}`);
  const data = (await response.json()) as { id?: string };
  return { id: data.id ?? null, delivered: true };
}
