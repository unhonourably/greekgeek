import type { Metadata } from "next";
import { ContactForm } from "./contact-form";

export const metadata: Metadata = { title: "Contact" };

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="font-serif text-4xl font-semibold tracking-tight">Contact</h1>
      <p className="mt-4 text-lg text-ink-2">
        GreekGeek is a student project. Amare and Owen are students at the University of Missouri, and we read every note.
      </p>
      <dl className="mt-8 grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-line bg-surface px-5 py-4">
          <dt className="text-[13px] text-ink-3">Amare</dt>
          <dd className="mt-1 text-sm font-medium text-ink">amare@greekgeek.org</dd>
        </div>
        <div className="rounded-lg border border-line bg-surface px-5 py-4">
          <dt className="text-[13px] text-ink-3">Owen</dt>
          <dd className="mt-1 text-sm font-medium text-ink">owen@greekgeek.org</dd>
        </div>
      </dl>
      <ContactForm />
    </div>
  );
}
