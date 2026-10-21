"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireChapter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { dbErrorMessage, zodState } from "@/lib/errors";
import { isStripeConfigured, serverEnv } from "@/lib/env";
import { createBillingPortal, createSubscriptionCheckout } from "@/lib/stripe/subscription";
import { createConnectedAccount, createOnboardingLink, syncConnectedAccount } from "@/lib/stripe/connect";
import type { ActionState } from "@/lib/action-state";

const agreementSchema = z.object({
  terms_id: z.uuid(),
  signer_name: z.string().trim().min(2, "Enter your full name").max(120),
  signer_title: z.string().trim().min(2, "Enter your title").max(80),
  agree: z.literal("on", { error: "Confirm that you accept the agreement" }),
  authority: z.literal("on", { error: "Confirm that you can sign for the chapter" }),
});

export async function acceptAgreement(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireChapter(slug, "chapter.ownership");
  const parsed = agreementSchema.safeParse({
    terms_id: formData.get("terms_id"),
    signer_name: formData.get("signer_name"),
    signer_title: formData.get("signer_title"),
    agree: formData.get("agree"),
    authority: formData.get("authority"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const h = await headers();
  const supabase = await createClient();
  const { error } = await supabase.rpc("accept_chapter_agreement", {
    p_chapter: chapter.id,
    p_terms: parsed.data.terms_id,
    p_signer_name: parsed.data.signer_name,
    p_signer_title: parsed.data.signer_title,
    p_ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    p_user_agent: h.get("user-agent"),
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/c/${slug}`, "layout");
  return { ok: true, message: "Agreement accepted." };
}

function billingUrl(slug: string, query = ""): string {
  return `${serverEnv.appUrl()}/c/${slug}/settings/billing${query}`;
}

export async function startSubscription(slug: string): Promise<void> {
  const ctx = await requireChapter(slug, "chapter.manage");
  if (!isStripeConfigured()) redirect(`/c/${slug}/settings/billing?error=stripe`);
  const supabase = await createClient();
  const { data: agreement } = await supabase
    .from("chapter_agreements")
    .select("id")
    .eq("chapter_id", ctx.chapter.id)
    .is("superseded_at", null)
    .maybeSingle();
  if (!agreement) redirect(`/c/${slug}/settings/billing?error=agreement`);
  const url = await createSubscriptionCheckout({
    chapterId: ctx.chapter.id,
    chapterName: [ctx.chapter.organization_name, ctx.chapter.designation].filter(Boolean).join(", "),
    email: ctx.user.email,
    successUrl: billingUrl(slug, "?subscription=success"),
    cancelUrl: billingUrl(slug, "?subscription=canceled"),
  });
  redirect(url);
}

export async function openBillingPortal(slug: string): Promise<void> {
  const ctx = await requireChapter(slug, "chapter.manage");
  if (!isStripeConfigured()) redirect(`/c/${slug}/settings/billing?error=stripe`);
  const url = await createBillingPortal(ctx.chapter.id, billingUrl(slug));
  redirect(url ?? `/c/${slug}/settings/billing?error=portal`);
}

export async function startConnectOnboarding(slug: string): Promise<void> {
  const ctx = await requireChapter(slug, "payments.configure");
  if (!isStripeConfigured()) redirect(`/c/${slug}/settings/billing?error=stripe`);
  if (ctx.chapter.status !== "verified") redirect(`/c/${slug}/settings/billing?error=verified`);
  const supabase = await createClient();
  const { data: agreement } = await supabase
    .from("chapter_agreements")
    .select("id")
    .eq("chapter_id", ctx.chapter.id)
    .is("superseded_at", null)
    .maybeSingle();
  if (!agreement) redirect(`/c/${slug}/settings/billing?error=agreement`);
  const admin = createAdminClient();
  const { data: existing } = await admin.from("connected_accounts").select("stripe_account_id").eq("chapter_id", ctx.chapter.id).maybeSingle();
  const accountId =
    existing?.stripe_account_id ??
    (await createConnectedAccount({
      chapterId: ctx.chapter.id,
      displayName: [ctx.chapter.organization_name, ctx.chapter.designation].filter(Boolean).join(" "),
      contactEmail: ctx.user.email,
      createdBy: ctx.user.id,
    }));
  const url = await createOnboardingLink(accountId, `${serverEnv.appUrl()}/api/connect/refresh?chapter=${encodeURIComponent(slug)}`, `${serverEnv.appUrl()}/api/connect/return?chapter=${encodeURIComponent(slug)}`);
  redirect(url);
}

export async function refreshConnectStatus(slug: string): Promise<void> {
  const ctx = await requireChapter(slug, "payments.configure");
  if (!isStripeConfigured()) redirect(`/c/${slug}/settings/billing?error=stripe`);
  const admin = createAdminClient();
  const { data } = await admin.from("connected_accounts").select("stripe_account_id").eq("chapter_id", ctx.chapter.id).maybeSingle();
  if (data?.stripe_account_id) await syncConnectedAccount(data.stripe_account_id);
  revalidatePath(`/c/${slug}`, "layout");
  redirect(`/c/${slug}/settings/billing`);
}
