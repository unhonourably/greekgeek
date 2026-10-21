"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireChapter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/action-state";

const schema = z.object({
  title: z.string().trim().min(2, "Use at least 2 characters").max(140),
  body: z.string().trim().min(1, "Write the announcement").max(8000),
  audience: z.enum(["all", "officers"]).catch("all"),
  pinned: z.boolean(),
  requires_ack: z.boolean(),
});

export async function publishAnnouncement(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter, user, can } = await requireChapter(slug, "announcements.publish");
  if (!rateLimit(`announce:${user.id}`, 10, 60 * 60_000)) return { error: "You have published a lot recently. Try again later." };
  const parsed = schema.safeParse({
    title: formData.get("title"),
    body: formData.get("body"),
    audience: formData.get("audience"),
    pinned: formData.get("pinned") === "on",
    requires_ack: formData.get("requires_ack") === "on",
  });
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors };
  }
  if (parsed.data.audience === "officers" && !can("announcements.officers")) return { error: "You cannot post officer-only announcements." };
  const supabase = await createClient();
  const { error } = await supabase.from("announcements").insert({ chapter_id: chapter.id, author_id: user.id, ...parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  revalidatePath(`/c/${slug}/announcements`);
  return { ok: true, message: "Announcement published. Members have been notified." };
}

async function update(slug: string, id: string, patch: Record<string, unknown>) {
  const { chapter } = await requireChapter(slug, "announcements.publish");
  const supabase = await createClient();
  await supabase.from("announcements").update(patch).eq("id", id).eq("chapter_id", chapter.id);
  revalidatePath(`/c/${slug}/announcements`);
}

export async function setPinned(slug: string, id: string, pinned: boolean): Promise<void> {
  await update(slug, id, { pinned });
}

export async function archiveAnnouncement(slug: string, id: string): Promise<void> {
  await update(slug, id, { archived_at: new Date().toISOString(), pinned: false });
}

export async function acknowledge(slug: string, id: string): Promise<void> {
  const { user } = await requireChapter(slug);
  const supabase = await createClient();
  await supabase.from("announcement_acks").upsert({ announcement_id: id, user_id: user.id }, { onConflict: "announcement_id,user_id", ignoreDuplicates: true });
  revalidatePath(`/c/${slug}/announcements`);
}
