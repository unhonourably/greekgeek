"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient, createSessionClient } from "@/lib/supabase/server";
import { dbErrorMessage } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import type { ActionState } from "@/lib/action-state";

const VIS = z.enum(["chapter", "officers", "private"]).catch("chapter");
const DETAIL_FIELDS = ["pronouns", "major", "hometown", "bio", "interests", "social_links", "phone"] as const;
const LINK_KEYS = ["Website", "LinkedIn", "Instagram"] as const;

const profileSchema = z.object({
  display_name: z.string().trim().min(1, "Enter the name members will see").max(80),
  full_name: z.string().trim().max(120),
  graduation_year: z.union([z.literal(""), z.coerce.number().int().min(1950).max(2100)]),
  pronouns: z.string().trim().max(40),
  major: z.string().trim().max(120),
  hometown: z.string().trim().max(120),
  bio: z.string().trim().max(1000),
  interests: z.string().max(600),
  phone: z.union([z.literal(""), z.string().trim().regex(/^[0-9+() .-]{7,24}$/, "Use digits, spaces, and + ( ) - only")]),
});

export async function saveProfile(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const raw = Object.fromEntries(["display_name", "full_name", "graduation_year", "pronouns", "major", "hometown", "bio", "interests", "phone"].map((k) => [k, String(formData.get(k) ?? "")]));
  const parsed = profileSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
    return { fieldErrors, values: raw };
  }
  const d = parsed.data;
  const links: Record<string, string> = {};
  for (const key of LINK_KEYS) {
    const v = String(formData.get(`link_${key}`) ?? "").trim();
    if (!v) continue;
    const url = /^https?:\/\//i.test(v) ? v : `https://${v}`;
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") throw new Error();
      links[key] = u.toString().slice(0, 300);
    } catch {
      return { fieldErrors: { [`link_${key}`]: "Enter a valid web address" }, values: raw };
    }
  }
  const interests = Array.from(new Set(d.interests.split(",").map((s) => s.trim()).filter(Boolean).map((s) => s.slice(0, 40)))).slice(0, 20);
  const visibility = Object.fromEntries(DETAIL_FIELDS.map((f) => [f, VIS.parse(formData.get(`vis_${f}`))]));
  const supabase = await createClient();
  const { error: e1 } = await supabase
    .from("profiles")
    .update({ display_name: d.display_name, full_name: d.full_name, graduation_year: typeof d.graduation_year === "number" ? d.graduation_year : null })
    .eq("id", user.id);
  if (e1) return { error: dbErrorMessage(e1), values: raw };
  const { error: e2 } = await supabase
    .from("profile_details")
    .update({
      pronouns: d.pronouns || null,
      major: d.major || null,
      hometown: d.hometown || null,
      bio: d.bio || null,
      interests,
      social_links: links,
      phone: d.phone || null,
      visibility,
    })
    .eq("user_id", user.id);
  if (e2) return { error: dbErrorMessage(e2), values: raw };
  revalidatePath("/", "layout");
  return { ok: true, message: "Profile saved." };
}

const AVATAR_TYPES: Record<string, { ext: string; magic: (b: Uint8Array) => boolean }> = {
  "image/png": { ext: "png", magic: (b) => b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 },
  "image/jpeg": { ext: "jpg", magic: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  "image/webp": { ext: "webp", magic: (b) => b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50 },
};

export async function uploadAvatar(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  if (!rateLimit(`avatar:${user.id}`, 10, 60 * 60_000)) return { error: "Too many uploads. Try again later." };
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose an image." };
  if (file.size > 2 * 1024 * 1024) return { error: "Images must be under 2 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const type = Object.entries(AVATAR_TYPES).find(([, t]) => t.magic(bytes));
  if (!type) return { error: "Use a PNG, JPEG, or WebP image." };
  const path = `${user.id}/${randomUUID()}.${type[1].ext}`;
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  const { error: upErr } = await supabase.storage.from("avatars").upload(path, bytes, { contentType: type[0], upsert: false });
  if (upErr) return { error: "Upload failed. Try again." };
  const { error } = await supabase.from("profiles").update({ avatar_path: path }).eq("id", user.id);
  if (error) {
    await supabase.storage.from("avatars").remove([path]);
    return { error: dbErrorMessage(error) };
  }
  if (before?.avatar_path && before.avatar_path.startsWith(`${user.id}/`)) await supabase.storage.from("avatars").remove([before.avatar_path]);
  revalidatePath("/", "layout");
  return { ok: true, message: "Photo updated." };
}

export async function removeAvatar(): Promise<void> {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: before } = await supabase.from("profiles").select("avatar_path").eq("id", user.id).single();
  await supabase.from("profiles").update({ avatar_path: null }).eq("id", user.id);
  if (before?.avatar_path && before.avatar_path.startsWith(`${user.id}/`)) await supabase.storage.from("avatars").remove([before.avatar_path]);
  revalidatePath("/", "layout");
}

export async function changePassword(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const current = String(formData.get("current") ?? "");
  const password = String(formData.get("password") ?? "");
  const confirm = String(formData.get("confirm") ?? "");
  if (!rateLimit(`pw:${user.id}`, 5, 15 * 60_000)) return { error: "Too many attempts. Try again in 15 minutes." };
  if (password.length < 10 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) return { fieldErrors: { password: "Use at least 10 characters with a letter and a number" } };
  if (password !== confirm) return { fieldErrors: { confirm: "Passwords do not match" } };
  const verifier = await createClient();
  const { error: authErr } = await verifier.auth.signInWithPassword({ email: user.email, password: current });
  if (authErr) return { fieldErrors: { current: "Current password is incorrect" } };
  const supabase = await createSessionClient();
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: "Could not update your password. Try again." };
  redirect("/account?password=changed");
}

export async function saveNotificationPreferences(_: ActionState, formData: FormData): Promise<ActionState> {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: kinds } = await supabase.from("notification_kinds").select("kind, required");
  const rows = (kinds ?? []).map((k) => ({
    user_id: user.id,
    kind: k.kind as string,
    in_app: k.required ? true : formData.get(`in_app_${k.kind}`) === "on",
    email: formData.get(`email_${k.kind}`) === "on",
    updated_at: new Date().toISOString(),
  }));
  const { error } = await supabase.from("notification_preferences").upsert(rows, { onConflict: "user_id,kind" });
  if (error) return { error: dbErrorMessage(error) };
  return { ok: true, message: "Notification settings saved." };
}
