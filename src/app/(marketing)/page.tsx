import {
  BadgeCheck,
  BedDouble,
  CalendarCheck,
  ClipboardList,
  HandCoins,
  Landmark,
  MessagesSquare,
  ReceiptText,
  ShieldCheck,
  UserRoundSearch,
  UsersRound,
} from "lucide-react";
import { Suspense } from "react";
import { DuesExample, FeeCalculator, PricingEstimate } from "@/components/fee-calculator";
import { ProductTour } from "@/components/product-tour";
import { ButtonLink } from "@/components/ui";
import { ESTIMATE_DEFAULTS, readEstimateParams, type EstimateInput } from "@/lib/estimate";
import { formatBps } from "@/lib/fees";
import { formatCents } from "@/lib/money";
import { getPublishedPricing } from "@/lib/pricing";

const modules = [
  { icon: HandCoins, title: "Dues and payments", body: "Assess dues, offer installment plans, record cash and checks, issue credits, and accept card or bank payments through Stripe." },
  { icon: ReceiptText, title: "An auditable ledger", body: "Every charge, payment, fee, refund, and dispute is a balanced ledger entry. Treasurers can reconcile against Stripe and hand off clean books." },
  { icon: UsersRound, title: "Member records", body: "Profiles, member classes, officer history, and a searchable directory with privacy controls each member sets for themselves." },
  { icon: MessagesSquare, title: "Chapter chat", body: "Channels, direct messages, threads, mentions, and moderation tools, with membership tied to roles so access updates itself." },
  { icon: CalendarCheck, title: "Events and attendance", body: "RSVPs, capacity limits, QR check-in, required-attendance tracking, and corrections with a reason on record." },
  { icon: UserRoundSearch, title: "Recruitment", body: "A pipeline for prospects with stages, assignments, follow-ups, and notes that can be restricted to recruitment leadership." },
  { icon: ClipboardList, title: "Standards and operations", body: "Policy acknowledgments, training, confidential incident reports, philanthropy hours, and budgets." },
  { icon: BedDouble, title: "Chapter housing", body: "Rooms and beds, move-ins and move-outs, roommate requests, a live occupancy view, and rent billed straight to residents." },
  { icon: BadgeCheck, title: "Verified chapters", body: "Every chapter is reviewed before it can collect money or invite members, so the account you join is the real one." },
];

export default function HomePage({ searchParams }: PageProps<"/">) {
  return (
    <Suspense fallback={<Home initial={ESTIMATE_DEFAULTS} />}>
      <HomeWithParams searchParams={searchParams} />
    </Suspense>
  );
}

async function HomeWithParams({ searchParams }: { searchParams: PageProps<"/">["searchParams"] }) {
  return <Home initial={readEstimateParams(await searchParams)} />;
}

async function Home({ initial }: { initial: EstimateInput }) {
  const { rule, plan } = await getPublishedPricing();

  return (
    <PricingEstimate initial={initial}>
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-[1.2fr_1fr] lg:py-28">
          <div>
            <h1 className="font-serif text-4xl font-semibold leading-[1.1] tracking-tight text-ink sm:text-5xl">
              The chapter office, handled.
            </h1>
            <p className="mt-5 max-w-xl text-lg text-ink-2">
              Collect dues with transparent pricing, keep books that reconcile, and run members, chat, events, and recruitment from one verified account.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Register your chapter</ButtonLink>
              <ButtonLink href="#calculator" variant="secondary">
                Calculate your cost
              </ButtonLink>
            </div>
            <p className="mt-4 text-[13px] text-ink-3">{formatCents(plan.priceCents)} per month per chapter. Members joining an existing chapter should use the invitation from their officers.</p>
          </div>
          <DuesExample rule={rule} />
        </div>
      </section>

      <section className="border-b border-line bg-surface/40">
        <div className="mx-auto max-w-6xl px-6 py-20">
          <div className="mb-10 max-w-2xl">
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Try it before you sign up</h2>
            <p className="mt-3 text-ink-2">These are the same screens officers and members use every week, filled with a sample chapter. Click around.</p>
          </div>
          <ProductTour />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="font-serif text-2xl font-semibold tracking-tight">What your officers get</h2>
        <div className="mt-10 grid gap-x-10 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map(({ icon: Icon, title, body }) => (
            <div key={title}>
              <Icon className="size-5 text-accent" aria-hidden />
              <h3 className="mt-3 text-[15px] font-semibold">{title}</h3>
              <p className="mt-1.5 text-sm text-ink-2">{body}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="border-y border-line bg-surface">
        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-20 lg:grid-cols-2">
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">Getting started</h2>
            <ol className="mt-6 space-y-5 text-sm">
              {[
                ["Apply", "An officer creates an account and submits the chapter's details and a way to confirm them."],
                ["Verification", "We review the application, check for existing chapters, and may ask for more information. You can follow every step."],
                ["Agreement, subscription, and payouts", "An administrator accepts the pricing agreement, starts the monthly subscription, and connects the chapter's bank account through Stripe."],
                ["Invite members", "Send invitations or import a roster. Members only see what their role allows."],
              ].map(([title, body], i) => (
                <li key={title} className="flex gap-4">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full border border-line-strong text-[13px] font-medium tnum">{i + 1}</span>
                  <div>
                    <p className="font-medium text-ink">{title}</p>
                    <p className="mt-0.5 text-ink-2">{body}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div>
            <h2 className="font-serif text-2xl font-semibold tracking-tight">How your data is protected</h2>
            <ul className="mt-6 space-y-4 text-sm text-ink-2">
              <li className="flex gap-3"><ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Every table is isolated per chapter with database-enforced row-level security, so one chapter can never read another&apos;s records.</li>
              <li className="flex gap-3"><Landmark className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Card and bank details are entered on Stripe&apos;s hosted checkout. Funds go to the chapter&apos;s own Stripe account.</li>
              <li className="flex gap-3"><ReceiptText className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Payment status only changes from verified Stripe events. Financial records are append-only and every officer action is logged.</li>
              <li className="flex gap-3"><MessagesSquare className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden />Direct messages and restricted recruitment notes are not visible to platform staff.</li>
            </ul>
          </div>
        </div>
      </section>

      <section id="calculator" className="mx-auto max-w-6xl scroll-mt-24 px-6 py-20">
        <div className="text-center">
          <h2 className="font-serif text-2xl font-semibold tracking-tight">Pricing you can explain at chapter meeting</h2>
          <p className="mx-auto mt-3 max-w-xl text-ink-2">
            {formatCents(plan.priceCents)} per month for the chapter, plus {formatBps(rule.platformFeeBps)} of each dues payment collected online. No platform fee on offline payments, credits, or balances that go unpaid.
          </p>
        </div>
        <div className="mt-10">
          <FeeCalculator rule={rule} subscriptionCents={plan.priceCents} />
        </div>
        <div className="mt-6 flex justify-center">
          <ButtonLink href="/pricing" variant="secondary">See full pricing details</ButtonLink>
        </div>
      </section>
    </PricingEstimate>
  );
}
