"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Checkbox, Field, Input } from "@/components/ui";
import { FormMessage, SubmitButton } from "@/components/forms";
import type { ActionState } from "@/lib/action-state";
import { requestPasswordReset, signIn, signUp, updatePassword } from "./actions";

export function SignInForm({ next }: { next: string }) {
  const [state, action] = useActionState(signIn, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={Boolean(state.fieldErrors?.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <div className="flex justify-end text-[13px]">
        <Link href="/forgot-password" className="text-ink-2 hover:text-ink">Forgot password?</Link>
      </div>
      <SubmitButton className="w-full" pendingLabel="Signing in">Sign in</SubmitButton>
    </form>
  );
}

export function SignUpForm({ next }: { next: string }) {
  const [state, action] = useActionState(signUp, {} as ActionState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <input type="hidden" name="next" value={next} />
      <FormMessage state={state} />
      <Field label="Full name" htmlFor="fullName" error={state.fieldErrors?.fullName}>
        <Input id="fullName" name="fullName" autoComplete="name" required defaultValue={state.values?.fullName} aria-invalid={Boolean(state.fieldErrors?.fullName)} />
      </Field>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email} hint="Use your school email if you plan to verify a chapter with it.">
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} aria-invalid={Boolean(state.fieldErrors?.email)} />
      </Field>
      <Field label="Password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required aria-invalid={Boolean(state.fieldErrors?.password)} />
      </Field>
      <div>
        <Checkbox
          name="terms"
          label={
            <>
              I agree to the <Link href="/legal/terms" className="text-accent hover:underline" target="_blank">Terms of Service</Link> and{" "}
              <Link href="/legal/privacy" className="text-accent hover:underline" target="_blank">Privacy Policy</Link>.
            </>
          }
        />
        {state.fieldErrors?.terms ? <p className="mt-1 text-[13px] text-danger">{state.fieldErrors.terms}</p> : null}
      </div>
      <SubmitButton className="w-full" pendingLabel="Creating account">Create account</SubmitButton>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, {} as ActionState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email" error={state.fieldErrors?.email}>
        <Input id="email" name="email" type="email" autoComplete="email" required defaultValue={state.values?.email} />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Sending">Send reset link</SubmitButton>
    </form>
  );
}

export function ResetPasswordForm() {
  const [state, action] = useActionState(updatePassword, {} as ActionState);
  return (
    <form action={action} className="space-y-4" noValidate>
      <FormMessage state={state} />
      <Field label="New password" htmlFor="password" error={state.fieldErrors?.password} hint="At least 10 characters, with a letter and a number.">
        <Input id="password" name="password" type="password" autoComplete="new-password" required />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={state.fieldErrors?.confirm}>
        <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
      </Field>
      <SubmitButton className="w-full" pendingLabel="Saving">Save password</SubmitButton>
    </form>
  );
}
