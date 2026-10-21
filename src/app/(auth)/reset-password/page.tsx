import type { Metadata } from "next";
import { requireUser } from "@/lib/auth";
import { ResetPasswordForm } from "../auth-forms";

export const metadata: Metadata = { title: "Choose a new password" };

export default async function ResetPasswordPage() {
  await requireUser("/reset-password");
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Choose a new password</h1>
      <div className="mt-6">
        <ResetPasswordForm />
      </div>
    </>
  );
}
