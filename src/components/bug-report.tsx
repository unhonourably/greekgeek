"use client";

import { useEffect, useId, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { Bug } from "lucide-react";
import { reportBug } from "@/app/(app)/bug-report";
import { ActionForm, FormMessage, SubmitButton } from "@/components/forms";
import { Button, Field, Textarea } from "@/components/ui";

export function BugReport() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const titleId = useId();
  const fieldId = useId();
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    area.current?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="flex w-full items-center gap-2.5 rounded-md px-3 py-1.5 text-left text-sm text-ink-2 hover:bg-subtle/70 hover:text-ink">
        <Bug className="size-4 shrink-0" aria-hidden />
        Report a bug
      </button>
      {open ? (
        <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setOpen(false)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="absolute bottom-4 left-4 w-[min(22rem,calc(100vw-2rem))] rounded-lg border border-line bg-surface p-4 shadow-xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <h2 id={titleId} className="text-sm font-semibold text-ink">Report a bug</h2>
            <p className="mt-1 text-[13px] text-ink-3">Tell us what happened on this page. The report goes to the GreekGeek team.</p>
            <ActionForm action={reportBug} className="mt-4 space-y-3">
              {(state) => (
                <>
                  <input type="hidden" name="page" value={pathname.slice(0, 300)} />
                  {state.ok ? null : (
                    <Field label="What went wrong" htmlFor={fieldId} error={state.fieldErrors?.message}>
                      <Textarea ref={area} id={fieldId} name="message" required minLength={10} maxLength={4000} placeholder="What you clicked, what you expected, and what happened instead." aria-invalid={state.fieldErrors?.message ? true : undefined} />
                    </Field>
                  )}
                  <FormMessage state={state} />
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
                      {state.ok ? "Close" : "Cancel"}
                    </Button>
                    {state.ok ? null : (
                      <SubmitButton size="sm" pendingLabel="Sending">
                        Send report
                      </SubmitButton>
                    )}
                  </div>
                </>
              )}
            </ActionForm>
          </div>
        </div>
      ) : null}
    </>
  );
}
