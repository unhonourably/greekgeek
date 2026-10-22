"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { X } from "lucide-react";
import { Badge } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";
import { SendForm } from "./forms";

type FormAction = (state: ActionState, formData: FormData) => Promise<ActionState>;

export type LetterDraft = {
  id: string;
  name: string;
  hasName: boolean;
  role: string;
  organization: string;
  email: string;
  emailsSent: number;
  replies: number;
  blocked: boolean;
  subject: string;
  body: string;
};

export function WriteLetters({ drafts, send, from, replyTo, canSend }: { drafts: LetterDraft[]; send: Record<string, FormAction>; from: string; replyTo: string; canSend: boolean }) {
  const [openId, setOpenId] = useState<string | null>(null);
  const titleId = useId();
  const letter = drafts.find((draft) => draft.id === openId) ?? null;

  useEffect(() => {
    if (!openId) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    document.getElementById("send-subject")?.focus();
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setOpenId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [openId]);

  return (
    <>
      <ul className="divide-y divide-line">
        {drafts.map((draft) => (
          <li key={draft.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="font-medium text-ink">{draft.name}</p>
              <p className="text-[13px] text-ink-2">{draft.hasName ? `${draft.role}, ${draft.organization}` : draft.role}</p>
              <p className="truncate font-mono text-[12px] text-ink-3">{draft.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {draft.replies > 0 ? <Badge tone="positive">Replied</Badge> : draft.emailsSent > 0 ? <Badge>Sent</Badge> : null}
              {draft.blocked ? <Badge tone="warning">Do not contact</Badge> : null}
              <button id={`write-${draft.id}`} type="button" onClick={() => setOpenId(draft.id)} className="text-sm text-ink hover:underline">Write</button>
              <Link href={`/admin/outreach/contacts/${draft.id}`} className="text-sm text-ink-3 hover:text-ink">History</Link>
            </div>
          </li>
        ))}
      </ul>
      {letter ? (
        <div className="veil-in fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-3 sm:items-center sm:p-6" onClick={() => setOpenId(null)}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            className="dialog-in flex max-h-[min(92vh,760px)] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-line bg-surface shadow-xl shadow-black/60"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
              <div className="min-w-0">
                <h2 id={titleId} className="truncate text-base font-semibold text-ink">Write to {letter.name}</h2>
                <p className="mt-0.5 truncate text-[13px] text-ink-3">{letter.hasName ? `${letter.role}, ${letter.organization}` : letter.role}</p>
              </div>
              <button type="button" aria-label="Close" onClick={() => { setOpenId(null); document.getElementById(`write-${letter.id}`)?.focus(); }} className="rounded-md p-1 text-ink-3 hover:bg-subtle hover:text-ink">
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-4">
              <SendForm
                key={letter.id}
                action={send[letter.id]}
                subject={letter.subject}
                body={letter.body}
                to={letter.email}
                from={from}
                replyTo={replyTo}
                label={letter.emailsSent > 0 ? "Send again" : "Send email"}
                disabled={letter.blocked || !canSend}
                bodyClassName="min-h-64 font-sans text-[13px] leading-relaxed"
              />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
