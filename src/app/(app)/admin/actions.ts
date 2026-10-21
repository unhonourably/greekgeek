"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireStaff } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { parseDollarsToCents } from "@/lib/money";
import type { ActionState } from "@/lib/action-state";

export async function reviewApplication(applicationId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["reviewer"]);
  const decision = z.enum(["verified", "info_requested", "rejected", "suspended"]).safeParse(formData.get("decision"));
  if (!decision.success) return { fieldErrors: { decision: "Choose a decision" } };
  const message = String(formData.get("message") ?? "").trim().slice(0, 4000);
  const note = String(formData.get("internal_note") ?? "").trim().slice(0, 4000);
  if ((decision.data === "rejected" || decision.data === "info_requested" || decision.data === "suspended") && !message) {
    return { fieldErrors: { message: "Explain the decision to the applicant" } };
  }
  if (decision.data === "verified" && formData.get("confirm") !== "on") return { fieldErrors: { confirm: "Confirm that the evidence supports verification" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("review_chapter_application", {
    p_application: applicationId,
    p_decision: decision.data,
    p_message: message || null,
    p_internal_note: note || null,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin", "layout");
  const done = { verified: "Chapter verified. The applicant is now its administrator.", info_requested: "Request sent to the applicant.", rejected: "Application rejected.", suspended: "Chapter suspended." };
  return { ok: true, message: done[decision.data] };
}

export async function addInternalNote(applicationId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff(["reviewer"]);
  const message = String(formData.get("note") ?? "").trim().slice(0, 4000);
  if (!message) return { fieldErrors: { note: "Write a note" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("add_application_note", { p_application: applicationId, p_note: message });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/admin/verification/${applicationId}`);
  return { ok: true, message: "Note added." };
}

export async function setChapterStatus(chapterId: string, _: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff([]);
  const status = z.enum(["verified", "suspended", "closed"]).safeParse(formData.get("status"));
  if (!status.success) return { fieldErrors: { status: "Choose a status" } };
  const reason = String(formData.get("reason") ?? "").trim().slice(0, 1000);
  if (!reason) return { fieldErrors: { reason: "A reason is required and is recorded in the audit log" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_set_chapter_status", { p_chapter: chapterId, p_status: status.data, p_reason: reason });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath("/admin/chapters", "layout");
  return { ok: true, message: "Status updated." };
}

const pricingSchema = z.object({
  code: z.string().trim().regex(/^[a-z0-9_-]{3,40}$/, "Use 3 to 40 lowercase letters, numbers, dashes, or underscores"),
  name: z.string().trim().min(3, "Name the rule").max(120),
  percent: z.coerce.number().min(0, "0% or more").max(10, "At most 10%"),
  fixed: z.string().trim().optional(),
  min: z.string().trim().optional(),
  max: z.string().trim().optional(),
  refund_policy: z.enum(["proportional", "none"]).catch("proportional"),
  terms_version: z.string().trim().min(1, "Version the agreement").max(40),
  terms_title: z.string().trim().min(3, "Title the agreement").max(160),
  terms_summary: z.string().trim().min(10, "Summarize what changed").max(1000),
  terms_body: z.string().trim().min(50, "Include the full agreement text").max(50000),
});

export async function publishPricing(_: ActionState, formData: FormData): Promise<ActionState> {
  await requireStaff([]);
  const parsed = pricingSchema.safeParse(Object.fromEntries([...formData.entries()].filter(([, v]) => typeof v === "string")));
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const cents = (v: string | undefined, field: string): number | null | { error: string } => {
    if (!v) return null;
    const c = parseDollarsToCents(v);
    return c === null ? { error: field } : c;
  };
  const fixed = cents(d.fixed, "fixed");
  const min = cents(d.min, "min");
  const max = cents(d.max, "max");
  for (const [k, v] of Object.entries({ fixed, min, max })) {
    if (v && typeof v === "object") return { fieldErrors: { [k]: "Enter a dollar amount" } };
  }
  if (typeof fixed === "number" && fixed > 500) return { fieldErrors: { fixed: "At most $5.00" } };
  if (typeof min === "number" && typeof max === "number" && max < min) return { fieldErrors: { max: "Must be at least the minimum" } };
  if (formData.get("confirm") !== "on") return { fieldErrors: { confirm: "Confirm that chapters must accept the new agreement before it applies" } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("platform_publish_pricing_rule", {
    p_code: d.code,
    p_name: d.name,
    p_bps: Math.round(d.percent * 100),
    p_fixed: (fixed as number | null) ?? 0,
    p_min: min as number | null,
    p_max: max as number | null,
    p_refund_policy: d.refund_policy,
    p_make_default: formData.get("make_default") === "on",
    p_terms_version: d.terms_version,
    p_terms_title: d.terms_title,
    p_terms_summary: d.terms_summary,
    p_terms_body: d.terms_body,
  });
  if (error) return { error: error.code === "23505" ? "That agreement version already exists." : dbErrorMessage(error) };
  revalidatePath("/admin/pricing");
  revalidatePath("/pricing");
  redirect("/admin/pricing?published=1");
}
