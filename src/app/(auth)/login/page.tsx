import type { Metadata } from "next";
import Link from "next/link";
import { SignInForm } from "../auth-forms";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/home";
  const error = typeof sp.error === "string" ? sp.error : null;
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">Sign in</h1>
      <p className="mt-1 text-sm text-ink-2">Welcome back.</p>
      {error ? <p className="mt-4 rounded-md border border-danger/20 bg-danger-soft px-3 py-2 text-sm text-danger">That link is invalid or has expired.</p> : null}
      <div className="mt-6">
        <SignInForm next={next} />
      </div>
      <p className="mt-6 text-center text-sm text-ink-2">
        New here? <Link href={`/signup?next=${encodeURIComponent(next)}`} className="text-accent hover:underline">Create an account</Link>
      </p>
    </>
  );
}
