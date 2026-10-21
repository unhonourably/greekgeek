import type { Metadata } from "next";
import { Check } from "lucide-react";
import { Badge, ButtonLink, Card, CardBody, PageHeader, cx } from "@/components/ui";
import { requireChapter } from "@/lib/auth";
import { loadChapterSetup } from "@/lib/chapter-setup";
import { restoreSetupStep, skipSetupStep } from "./actions";

export const metadata: Metadata = { title: "Setup" };

export default async function SetupPage({ params }: PageProps<"/c/[slug]/setup">) {
  const { slug } = await params;
  const { chapter, can } = await requireChapter(slug, "chapter.manage");
  const steps = await loadChapterSetup(chapter, can);
  const done = steps.filter((step) => step.done).length;
  const next = steps.find((step) => !step.done);
  const pct = Math.round((done / steps.length) * 100);

  return (
    <>
      <PageHeader
        title="Chapter setup"
        description={next ? `${done} of ${steps.length} finished. ${next.title} is the next step.` : "Every setup step is finished. You can still open any of them."}
      />
      <Card className="mb-6">
        <CardBody>
          <div className="flex items-center justify-between gap-3 text-[13px] text-ink-2">
            <span>Progress</span>
            <span className="tnum">{pct}%</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-canvas" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Chapter setup">
            <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${pct}%` }} />
          </div>
        </CardBody>
      </Card>
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li key={step.id}>
            <Card>
              <CardBody className="flex flex-col gap-4 sm:flex-row sm:items-start">
                <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-medium", step.done ? "bg-accent text-on-accent" : "bg-canvas text-ink-2")}>
                  {step.done ? <Check className="size-4" aria-hidden /> : index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-ink">{step.title}</h2>
                    {step.done && !step.skipped ? <Badge tone="positive">Done</Badge> : null}
                    {step.skipped ? <Badge>Skipped</Badge> : null}
                    {step.optional && !step.done ? <Badge>Optional</Badge> : null}
                  </div>
                  <p className="mt-1 text-sm leading-relaxed text-ink-2">{step.detail}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <ButtonLink href={step.href} size="sm" variant={step.done ? "secondary" : "primary"}>
                      {step.done ? "Open" : "Go to this step"}
                    </ButtonLink>
                    {step.optional && !step.done ? (
                      <form action={skipSetupStep.bind(null, slug, step.id)}>
                        <button type="submit" className="h-8 rounded-md px-3 text-[13px] text-ink-2 hover:bg-subtle hover:text-ink">
                          Skip for now
                        </button>
                      </form>
                    ) : null}
                    {step.skipped ? (
                      <form action={restoreSetupStep.bind(null, slug, step.id)}>
                        <button type="submit" className="h-8 rounded-md px-3 text-[13px] text-ink-2 hover:bg-subtle hover:text-ink">
                          Put this back
                        </button>
                      </form>
                    ) : null}
                  </div>
                </div>
              </CardBody>
            </Card>
          </li>
        ))}
      </ol>
    </>
  );
}
