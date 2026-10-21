"use client";

import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

export function AnnouncementComposer({ action, canOfficers }: { action: (s: ActionState, f: FormData) => Promise<ActionState>; canOfficers: boolean }) {
  return (
    <ActionForm action={action} className="space-y-4" resetOnSuccess>
      {(state) => (
        <>
          <FormMessage state={state} />
          <Field label="Title" htmlFor="title" error={state.fieldErrors?.title}>
            <Input id="title" name="title" maxLength={140} />
          </Field>
          <Field label="Message" htmlFor="body" error={state.fieldErrors?.body}>
            <Textarea id="body" name="body" maxLength={8000} className="min-h-32" />
          </Field>
          <div className="flex flex-wrap items-start gap-x-6 gap-y-3">
            {canOfficers ? (
              <Field label="Audience" htmlFor="audience" className="w-48">
                <Select id="audience" name="audience" defaultValue="all">
                  <option value="all">Whole chapter</option>
                  <option value="officers">Officers only</option>
                </Select>
              </Field>
            ) : null}
            <div className="space-y-2 pt-1">
              <Checkbox name="pinned" label="Pin to the top" />
              <Checkbox name="requires_ack" label="Ask members to acknowledge" description="Track who has read it." />
            </div>
          </div>
          <div className="flex justify-end">
            <SubmitButton pendingLabel="Publishing">Publish</SubmitButton>
          </div>
        </>
      )}
    </ActionForm>
  );
}
