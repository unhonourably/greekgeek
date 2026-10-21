import type { Metadata } from "next";
import Link from "next/link";
import { SignUpForm } from "../auth-forms";

export const metadata: Metadata = { title: "Create an account" };

export default async function SignUpPage({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/home";
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-ink-2">
        Officers register their chapter after signing up. Members can accept an invitation once their account exists.
      </p>
      <div className="mt-6">
        <SignUpForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-ink-2">
        Already have an account? <Link href={`/login?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Sign in</Link>
      </p>
    </>
  );
}
