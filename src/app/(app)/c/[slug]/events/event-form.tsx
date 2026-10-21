"use client";

import { useActionState, useState } from "react";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/forms";
import { EVENT_CATEGORIES, EVENT_CATEGORY_LABEL } from "@/lib/events";
import { MEMBER_CLASS_LABEL } from "@/lib/permissions";
import type { ActionState } from "@/lib/action-state";

export type EventFormInitial = {
  title: string;
  description: string;
  location: string;
  category: string;
  date: string;
  start: string;
  end: string;
  visibility: string;
  attendance_required: boolean;
  required_classes: string[];
  capacity: string;
  rsvp_deadline_date: string;
  rsvp_deadline_time: string;
};

export function EventForm({ action, initial, timezone }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; initial?: EventFormInitial; timezone: string }) {
  const [state, formAction] = useActionState(action, {});
  const [required, setRequired] = useState(initial?.attendance_required ?? false);
  const classes = new Set(initial?.required_classes ?? []);
  const e = state.fieldErrors ?? {};
  return (
    <form action={formAction} className="space-y-5" noValidate>
      <FormMessage state={state} />
      <Field label="Title" htmlFor="title" error={e.title}>
        <Input id="title" name="title" defaultValue={initial?.title} maxLength={140} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[1fr_220px]">
        <Field label="Location" htmlFor="location" error={e.location}>
          <Input id="location" name="location" defaultValue={initial?.location} maxLength={200} placeholder="Chapter house, room 101" />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={initial?.category ?? "chapter"}>
            {EVENT_CATEGORIES.map((c) => (
              <option key={c} value={c}>{EVENT_CATEGORY_LABEL[c]}</option>
            ))}
          </Select>
        </Field>
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Date" htmlFor="date" error={e.date}>
          <Input id="date" name="date" type="date" defaultValue={initial?.date} />
        </Field>
        <Field label="Starts" htmlFor="start" error={e.start}>
          <Input id="start" name="start" type="time" defaultValue={initial?.start} />
        </Field>
        <Field label="Ends" htmlFor="end" error={e.end} hint="An earlier time means the next day.">
          <Input id="end" name="end" type="time" defaultValue={initial?.end} />
        </Field>
      </div>
      <p className="-mt-2 text-[13px] text-ink-3">Times are in the chapter time zone, {timezone.replace(/_/g, " ")}.</p>
      <Field label="Details" htmlFor="description" error={e.description}>
        <Textarea id="description" name="description" defaultValue={initial?.description} maxLength={5000} className="min-h-24" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Capacity" htmlFor="capacity" error={e.capacity} hint="Optional">
          <Input id="capacity" name="capacity" type="number" min={1} max={10000} defaultValue={initial?.capacity} />
        </Field>
        <Field label="RSVP deadline" htmlFor="rsvp_deadline_date" error={e.rsvp_deadline_date} hint="Optional">
          <Input id="rsvp_deadline_date" name="rsvp_deadline_date" type="date" defaultValue={initial?.rsvp_deadline_date} />
        </Field>
        <Field label="Deadline time" htmlFor="rsvp_deadline_time">
          <Input id="rsvp_deadline_time" name="rsvp_deadline_time" type="time" defaultValue={initial?.rsvp_deadline_time} />
        </Field>
      </div>
      <Field label="Visible to" htmlFor="visibility" className="max-w-xs">
        <Select id="visibility" name="visibility" defaultValue={initial?.visibility ?? "chapter"}>
          <option value="chapter">Whole chapter</option>
          <option value="officers">Officers only</option>
        </Select>
      </Field>
      <fieldset className="space-y-3">
        <Checkbox
          name="attendance_required"
          checked={required}
          onChange={(ev) => setRequired(ev.target.checked)}
          label="Attendance is required"
          description="Required events count toward attendance rates and standards reports."
        />
        {required ? (
          <div className="ml-7 space-y-2">
            <p className="text-[13px] text-ink-3">Required for these classes. Leave all unchecked to require everyone.</p>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {Object.entries(MEMBER_CLASS_LABEL).map(([v, l]) => (
                <Checkbox key={v} name="required_classes" value={v} defaultChecked={classes.has(v)} label={l} />
              ))}
            </div>
          </div>
        ) : null}
      </fieldset>
      <div className="flex justify-end">
        <SubmitButton pendingLabel="Saving">{initial ? "Save changes" : "Create event"}</SubmitButton>
      </div>
    </form>
  );
}
