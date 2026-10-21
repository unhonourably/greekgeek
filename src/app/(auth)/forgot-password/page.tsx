import type { Metadata } from "next";
import Link from "next/link";
import { ForgotPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Reset password" };

export default function ForgotPasswordPage() {
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Reset your password</h1>
      <p className="mt-1 text-sm text-ink-2">We will email you a link to choose a new password.</p>
      <div className="mt-6">
        <ForgotPasswordForm />
      </div>
      <p className="mt-6 text-center text-sm"><Link href="/login" className="text-ink-2 hover:text-ink">Back to sign in</Link></p>
    </>
  );
}
