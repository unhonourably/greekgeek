"use client";

import { useActionState, useEffect, useRef, type ReactNode } from "react";
import { useFormStatus } from "react-dom";
import { LoaderCircle } from "lucide-react";
import { Button, Notice, buttonClass, cx } from "@/components/ui";
import type { ActionState } from "@/lib/action-state";

export function SubmitButton({
  children,
  pendingLabel,
  variant = "primary",
  size = "md",
  className,
  disabled,
  name,
  value,
}: {
  children: ReactNode;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  className?: string;
  disabled?: boolean;
  name?: string;
  value?: string;
}) {
  const { pending, data } = useFormStatus();
  const active = pending && (!name || !data?.has(name) || data.get(name) === value);
  return (
    <Button type="submit" variant={variant} size={size} className={className} disabled={pending || disabled} aria-busy={active} name={name} value={value}>
      {active ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {active && pendingLabel ? pendingLabel : children}
    </Button>
  );
}

export function FormMessage({ state }: { state: ActionState }) {
  if (state.error) return <Notice tone="danger">{state.error}</Notice>;
  if (state.message) return <Notice tone="positive">{state.message}</Notice>;
  return null;
}

export function ActionForm({
  action,
  children,
  className,
  resetOnSuccess,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  children: (state: ActionState) => ReactNode;
  className?: string;
  resetOnSuccess?: boolean;
}) {
  const [state, formAction] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (resetOnSuccess && state.ok) ref.current?.reset();
  }, [state, resetOnSuccess]);
  return (
    <form ref={ref} action={formAction} className={className} noValidate>
      {children(state)}
    </form>
  );
}

export function ConfirmSubmit({
  children,
  message,
  variant = "danger",
  size = "sm",
}: {
  children: ReactNode;
  message: string;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}) {
  const { pending } = useFormStatus();
  return (
    <button
      suppressHydrationWarning
      type="submit"
      className={cx(buttonClass(variant, size))}
      disabled={pending}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </button>
  );
}
