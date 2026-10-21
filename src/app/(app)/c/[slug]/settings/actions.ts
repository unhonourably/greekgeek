"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireChapter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import type { ActionState } from "@/lib/action-state";

const MODULES = ["recruitment", "philanthropy", "housing", "standards", "academics"] as const;

function validTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const profileSchema = z.object({
  greek_letters: z.string().trim().max(24).optional(),
  description: z.string().trim().max(2000).optional(),
  founded_year: z.union([z.literal(""), z.coerce.number().int().min(1776).max(2100)]).optional(),
  timezone: z.string().refine(validTimezone, "Choose a valid time zone"),
});

export async function updateChapterProfile(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireChapter(slug, "chapter.manage");
  const parsed = profileSchema.safeParse({
    greek_letters: formData.get("greek_letters") ?? undefined,
    description: formData.get("description") ?? undefined,
    founded_year: formData.get("founded_year") ?? undefined,
    timezone: formData.get("timezone"),
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  const d = parsed.data;
  const supabase = await createClient();
  const { error } = await supabase
    .from("chapters")
    .update({
      greek_letters: d.greek_letters || null,
      description: d.description || null,
      founded_year: typeof d.founded_year === "number" ? d.founded_year : null,
      timezone: d.timezone,
    })
    .eq("id", chapter.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/c/${slug}`, "layout");
  return { ok: true, message: "Chapter profile saved." };
}

export async function updateModules(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireChapter(slug, "chapter.manage");
  const modules = Object.fromEntries(MODULES.map((m) => [m, formData.get(m) === "on"]));
  const supabase = await createClient();
  const { error } = await supabase.from("chapters").update({ modules }).eq("id", chapter.id);
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/c/${slug}`, "layout");
  return { ok: true, message: "Modules updated." };
}

export async function transferOwnership(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireChapter(slug, "chapter.ownership");
  const to = String(formData.get("membership_id") ?? "");
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (!z.uuid().safeParse(to).success) return { fieldErrors: { membership_id: "Choose a member" } };
  if (confirmation !== chapter.slug) return { fieldErrors: { confirmation: `Type ${chapter.slug} to confirm` } };
  const supabase = await createClient();
  const { error } = await supabase.rpc("transfer_chapter_ownership", {
    p_chapter: chapter.id,
    p_to_membership: to,
    p_remove_self: formData.get("remove_self") === "on",
    p_confirmation: confirmation,
  });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/c/${slug}`, "layout");
  return { ok: true, message: "Administrator access granted." };
}
