"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { dbErrorMessage, zodState } from "@/lib/errors";
import { rateLimit } from "@/lib/rate-limit";
import { formField, optionalText, requireModule, todayIn } from "@/lib/modules";
import { zonedTimeToUtc } from "@/lib/timezone";
import type { ActionState } from "@/lib/action-state";

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const TIME = /^\d{2}:\d{2}$/;

function refresh(slug: string) {
  revalidatePath(`/c/${slug}/housing`);
  revalidatePath(`/c/${slug}/housing/manage`);
}

const maintenanceSchema = z.object({
  title: z.string().min(3, "Describe the issue briefly").max(140),
  description: z.string().max(2000).nullable(),
  location: z.string().max(120).nullable(),
  priority: z.enum(["low", "normal", "high", "urgent"]).catch("normal"),
  facility_id: z.string().uuid().nullable().catch(null),
});

export async function submitMaintenance(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter, user } = await requireModule(slug, "housing");
  if (!rateLimit(`maint:${user.id}`, 15, 60 * 60_000)) return { error: "Too many requests. Try again later." };
  const parsed = maintenanceSchema.safeParse({
    title: formField(formData, "title"),
    description: optionalText(formData, "description"),
    location: optionalText(formData, "location"),
    priority: formField(formData, "priority"),
    facility_id: optionalText(formData, "facility_id"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("maintenance_requests").insert({ chapter_id: chapter.id, submitted_by: user.id, ...parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Request submitted. Housing officers will see it in their queue." };
}

const maintenanceUpdate = z.object({
  status: z.enum(["open", "in_progress", "resolved", "closed"]),
  assigned_membership_id: z.string().uuid().nullable().catch(null),
  resolution_note: z.string().max(2000).nullable(),
});

export async function updateMaintenance(slug: string, id: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const parsed = maintenanceUpdate.safeParse({
    status: formField(formData, "status"),
    assigned_membership_id: optionalText(formData, "assigned_membership_id"),
    resolution_note: optionalText(formData, "resolution_note"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const resolved = parsed.data.status === "resolved" || parsed.data.status === "closed";
  const supabase = await createClient();
  const { error } = await supabase
    .from("maintenance_requests")
    .update({ ...parsed.data, resolved_at: resolved ? new Date().toISOString() : null })
    .eq("id", id)
    .eq("chapter_id", chapter.id);
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Request updated." };
}

const reservationSchema = z.object({
  facility_id: z.string().uuid("Pick a space"),
  date: z.string().regex(DATE, "Pick a date"),
  start: z.string().regex(TIME, "Pick a start time"),
  end: z.string().regex(TIME, "Pick an end time"),
  purpose: z.string().max(200).nullable(),
});

export async function reserveFacility(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter, user } = await requireModule(slug, "housing");
  if (!rateLimit(`reserve:${user.id}`, 20, 60 * 60_000)) return { error: "Too many reservations. Try again later." };
  const parsed = reservationSchema.safeParse({
    facility_id: formField(formData, "facility_id"),
    date: formField(formData, "date"),
    start: formField(formData, "start"),
    end: formField(formData, "end"),
    purpose: optionalText(formData, "purpose"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const starts = zonedTimeToUtc(parsed.data.date, parsed.data.start, chapter.timezone);
  const ends = zonedTimeToUtc(parsed.data.date, parsed.data.end, chapter.timezone);
  if (!starts || !ends) return { error: "Check the date and times." };
  if (ends <= starts) return { fieldErrors: { end: "End time must be after the start" } };
  if (starts.getTime() < Date.now() - 5 * 60_000) return { fieldErrors: { date: "Reservations must be in the future" } };
  const supabase = await createClient();
  const { error } = await supabase.from("facility_reservations").insert({
    chapter_id: chapter.id,
    facility_id: parsed.data.facility_id,
    user_id: user.id,
    starts_at: starts.toISOString(),
    ends_at: ends.toISOString(),
    purpose: parsed.data.purpose,
  });
  if (error) {
    if (error.code === "23P01") return { error: "That time overlaps an existing reservation." };
    return { error: dbErrorMessage(error) };
  }
  refresh(slug);
  return { ok: true, message: "Reserved." };
}

export async function cancelReservation(slug: string, id: string): Promise<void> {
  const { chapter } = await requireModule(slug, "housing");
  const supabase = await createClient();
  await supabase.from("facility_reservations").update({ status: "cancelled" }).eq("id", id).eq("chapter_id", chapter.id).eq("status", "confirmed");
  refresh(slug);
}

export async function completeChore(slug: string, id: string, done: boolean): Promise<void> {
  const { chapter } = await requireModule(slug, "housing");
  const supabase = await createClient();
  await supabase.from("chores").update({ status: done ? "done" : "pending" }).eq("id", id).eq("chapter_id", chapter.id);
  refresh(slug);
}

const supplySchema = z.object({
  item_name: z.string().min(2, "What do you need?").max(120),
  quantity: z.coerce.number({ message: "Enter a quantity" }).int().min(1).max(1000),
  note: z.string().max(500).nullable(),
});

export async function requestSupply(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter, user } = await requireModule(slug, "housing");
  if (!rateLimit(`supply:${user.id}`, 20, 60 * 60_000)) return { error: "Too many requests. Try again later." };
  const parsed = supplySchema.safeParse({ item_name: formField(formData, "item_name"), quantity: formField(formData, "quantity") || 1, note: optionalText(formData, "note") });
  if (!parsed.success) return zodState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("supply_requests").insert({ chapter_id: chapter.id, requested_by: user.id, ...parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Request sent." };
}

export async function setSupplyStatus(slug: string, id: string, status: "approved" | "fulfilled" | "declined"): Promise<void> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const supabase = await createClient();
  const allowedFrom = status === "fulfilled" ? ["requested", "approved"] : ["requested"];
  await supabase.from("supply_requests").update({ status }).eq("id", id).eq("chapter_id", chapter.id).in("status", allowedFrom);
  refresh(slug);
}

const facilitySchema = z.object({
  name: z.string().min(2, "Name the space").max(80),
  kind: z.enum(["house", "room", "common_area", "parking", "other"]).catch("common_area"),
  reservable: z.boolean(),
});

export async function addFacility(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const parsed = facilitySchema.safeParse({ name: formField(formData, "name"), kind: formField(formData, "kind"), reservable: formData.get("reservable") === "on" });
  if (!parsed.success) return zodState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase.from("facilities").insert({ chapter_id: chapter.id, ...parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Space added." };
}

export async function setReservable(slug: string, id: string, reservable: boolean): Promise<void> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const supabase = await createClient();
  await supabase.from("facilities").update({ reservable }).eq("id", id).eq("chapter_id", chapter.id);
  refresh(slug);
}

const choreSchema = z.object({
  title: z.string().min(2, "Name the chore").max(120),
  assigned_membership_id: z.string().uuid("Pick a member"),
  due_on: z.string().regex(DATE, "Pick a due date"),
});

export async function assignChore(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter, user } = await requireModule(slug, "housing", "housing.manage");
  const parsed = choreSchema.safeParse({ title: formField(formData, "title"), assigned_membership_id: formField(formData, "assigned_membership_id"), due_on: formField(formData, "due_on") });
  if (!parsed.success) return zodState(parsed.error);
  if (parsed.data.due_on < todayIn(chapter.timezone, Date.now())) return { fieldErrors: { due_on: "Due date cannot be in the past" } };
  const supabase = await createClient();
  const { error } = await supabase.from("chores").insert({ chapter_id: chapter.id, created_by: user.id, ...parsed.data });
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Chore assigned. The member was notified." };
}

export async function markChoreMissed(slug: string, id: string): Promise<void> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const supabase = await createClient();
  await supabase.from("chores").update({ status: "missed" }).eq("id", id).eq("chapter_id", chapter.id).eq("status", "pending");
  refresh(slug);
}

const inventorySchema = z.object({
  name: z.string().min(2, "Name the item").max(120),
  quantity: z.coerce.number({ message: "Enter a quantity" }).int().min(0).max(100000),
  unit: z.string().max(20).nullable(),
  reorder_level: z.coerce.number().int().min(0).max(100000).nullable(),
  location: z.string().max(120).nullable(),
});

export async function saveInventoryItem(slug: string, _: ActionState, formData: FormData): Promise<ActionState> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  const reorder = formField(formData, "reorder_level");
  const parsed = inventorySchema.safeParse({
    name: formField(formData, "name"),
    quantity: formField(formData, "quantity") || 0,
    unit: optionalText(formData, "unit"),
    reorder_level: reorder ? reorder : null,
    location: optionalText(formData, "location"),
  });
  if (!parsed.success) return zodState(parsed.error);
  const supabase = await createClient();
  const { error } = await supabase
    .from("inventory_items")
    .upsert({ chapter_id: chapter.id, ...parsed.data, updated_at: new Date().toISOString() }, { onConflict: "chapter_id,name" });
  if (error) return { error: dbErrorMessage(error) };
  refresh(slug);
  return { ok: true, message: "Inventory saved." };
}

export async function adjustInventory(slug: string, id: string, delta: number): Promise<void> {
  const { chapter } = await requireModule(slug, "housing", "housing.manage");
  if (!Number.isInteger(delta) || Math.abs(delta) > 1000) return;
  const supabase = await createClient();
  const { data } = await supabase.from("inventory_items").select("quantity").eq("id", id).eq("chapter_id", chapter.id).maybeSingle();
  if (!data) return;
  await supabase
    .from("inventory_items")
    .update({ quantity: Math.max(0, data.quantity + delta), updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("chapter_id", chapter.id)
    .eq("quantity", data.quantity);
  refresh(slug);
}
