import Link from "next/link";
import { Wordmark } from "@/components/brand";
import { ButtonLink } from "@/components/ui";
import { brand } from "@/config/brand";

export default function MarketingLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-full flex-1 flex-col bg-canvas">
      <header className="border-b border-line bg-canvas/90 backdrop-blur">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-4 px-6 py-3">
          <Wordmark />
          <nav className="flex flex-wrap items-center justify-end gap-1 text-sm">
            <Link href="/contact" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">
              Contact
            </Link>
            <Link href="/pricing" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">
              Pricing
            </Link>
            <Link href="/login" className="rounded-md px-3 py-2 text-ink-2 hover:text-ink">
              Sign in
            </Link>
            <ButtonLink href="/signup" size="sm" className="ml-2">
              Register a chapter
            </ButtonLink>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-6 py-8 text-[13px] text-ink-3">
          <p>
            {brand.legalName}. Payments are processed by Stripe. {brand.name} never stores card or bank numbers.
          </p>
          <nav className="flex gap-4">
            <Link href="/contact" className="hover:text-ink">Contact</Link>
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/legal/chapter-agreement" className="hover:text-ink">GreekGeek agreement</Link>
            <Link href="/legal/terms" className="hover:text-ink">Terms</Link>
            <Link href="/legal/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}
