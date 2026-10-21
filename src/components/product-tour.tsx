"use client";

import { useState, type ReactNode } from "react";
import { BedDouble, CalendarCheck, Check, CircleCheck, HandCoins, LayoutDashboard, ListChecks, Send, UserRound, UsersRound, type LucideIcon } from "lucide-react";
import { cx } from "@/components/ui";
import { formatCents } from "@/lib/money";

type View = "treasurer" | "president" | "member" | "housing";

const VIEWS: Array<{ id: View; label: string; icon: LucideIcon; blurb: string }> = [
  { id: "treasurer", label: "Treasurer", icon: HandCoins, blurb: "Record a cash payment or bill a late joiner and watch the collection rate move." },
  { id: "president", label: "President", icon: LayoutDashboard, blurb: "The whole chapter at a glance. Switch the range to see attendance over the semester." },
  { id: "member", label: "Member", icon: UserRound, blurb: "What a brother or sister sees: their balance, RSVPs, and what they still owe the chapter." },
  { id: "housing", label: "House manager", icon: BedDouble, blurb: "Pick someone waiting for a room, then click a room with an open bed." },
];

export function ProductTour() {
  const [view, setView] = useState<View>("treasurer");
  const active = VIEWS.find((v) => v.id === view)!;
  return (
    <div className="grid gap-8 lg:grid-cols-[16rem_1fr]">
      <div>
        <div role="tablist" aria-label="Product tour" className="-mx-6 flex gap-1 overflow-x-auto px-6 lg:mx-0 lg:flex-col lg:overflow-visible lg:px-0">
          {VIEWS.map((v) => (
            <button
              key={v.id}
              role="tab"
              type="button"
              id={`tour-tab-${v.id}`}
              aria-selected={view === v.id}
              aria-controls="tour-panel"
              onClick={() => setView(v.id)}
              className={cx(
                "flex shrink-0 items-center gap-2.5 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                view === v.id ? "bg-surface text-ink ring-1 ring-line-strong" : "text-ink-3 hover:bg-surface/60 hover:text-ink-2",
              )}
            >
              <v.icon className={cx("size-4", view === v.id ? "text-accent" : "text-ink-3")} aria-hidden />
              {v.label}
            </button>
          ))}
        </div>
        <p className="mt-5 hidden text-sm text-ink-2 lg:block" aria-live="polite">{active.blurb}</p>
      </div>
      <div id="tour-panel" role="tabpanel" aria-labelledby={`tour-tab-${view}`} className="min-w-0 overflow-hidden rounded-xl border border-line bg-canvas shadow-[0_24px_60px_-30px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-surface px-4 py-2.5">
          <div className="flex items-center gap-1.5" aria-hidden>
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
            <span className="size-2.5 rounded-full bg-line-strong" />
          </div>
          <span className="truncate text-[12px] text-ink-3">Alpha Beta at State University</span>
          <span className="rounded-full border border-gold/40 px-2 py-0.5 text-[11px] font-medium text-gold">Sample data</span>
        </div>
        <p className="border-b border-line px-5 py-2.5 text-[13px] text-ink-2 lg:hidden">{active.blurb}</p>
        <div className="min-h-[25rem] p-5">
          {view === "treasurer" ? <TreasurerView /> : view === "president" ? <PresidentView /> : view === "member" ? <MemberView /> : <HousingView />}
        </div>
      </div>
    </div>
  );
}

function Panel({ title, action, children, className }: { title: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={cx("rounded-lg border border-line bg-surface", className)}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5">
        <h3 className="text-[13px] font-semibold text-ink">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

function Bar({ value, tone = "accent" }: { value: number; tone?: "accent" | "positive" }) {
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
      <span className={cx("block h-full rounded-full transition-[width] duration-500 ease-out", tone === "positive" ? "bg-positive" : "bg-accent")} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  );
}

const DUES = 45_000;

type Charge = { name: string; amount: number; paid: number; late?: boolean };

const START: Charge[] = [
  { name: "Marcus Hill", amount: DUES, paid: DUES },
  { name: "Devin Ortiz", amount: DUES, paid: DUES },
  { name: "Chris Nguyen", amount: DUES, paid: 22_500 },
  { name: "Sam Patel", amount: DUES, paid: 0 },
  { name: "Tyler Brooks", amount: DUES, paid: 0 },
];

function TreasurerView() {
  const [rows, setRows] = useState<Charge[]>(START);
  const [lateAdded, setLateAdded] = useState(false);
  const [reminded, setReminded] = useState(false);
  const billed = rows.reduce((s, r) => s + r.amount, 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  const unpaid = rows.filter((r) => r.paid < r.amount);
  const pct = billed ? (collected / billed) * 100 : 0;
  const recordCash = (name: string) => setRows((rs) => rs.map((r) => (r.name === name ? { ...r, paid: r.amount } : r)));
  const reset = () => {
    setRows(START);
    setLateAdded(false);
    setReminded(false);
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Billed" value={formatCents(billed)} />
        <Stat label="Collected" value={formatCents(collected)} tone="positive" />
        <Stat label="Outstanding" value={formatCents(billed - collected)} tone={billed - collected > 0 ? "warning" : undefined} />
      </div>
      <Panel
        title="Fall dues"
        action={
          <button type="button" onClick={reset} className="text-[12px] text-ink-3 hover:text-ink-2">
            Reset
          </button>
        }
      >
        <div className="space-y-1.5 px-4 pt-3">
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-3">Collection rate</span>
            <span className="font-semibold text-ink tnum">{Math.round(pct)}%</span>
          </div>
          <Bar value={pct} tone={pct >= 100 ? "positive" : "accent"} />
        </div>
        <ul className="mt-2 divide-y divide-line">
          {rows.map((r) => {
            const done = r.paid >= r.amount;
            return (
              <li key={r.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] text-ink">{r.name}</p>
                  <p className="text-[11px] text-ink-3">
                    {done ? "Paid in full" : r.paid > 0 ? `${formatCents(r.amount - r.paid)} left on installments` : `${formatCents(r.amount)} due`}
                    {r.late ? " · joined late, prorated" : ""}
                  </p>
                </div>
                {done ? (
                  <span className="flex items-center gap-1 text-[12px] text-positive"><CircleCheck className="size-3.5" aria-hidden />Paid</span>
                ) : (
                  <button type="button" onClick={() => recordCash(r.name)} className="rounded-md border border-line px-2.5 py-1 text-[12px] text-ink-2 transition-colors hover:border-line-strong hover:text-ink">
                    Record cash
                  </button>
                )}
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
          {lateAdded ? (
            <span className="text-[12px] text-ink-3">Jordan was notified and can pay online.</span>
          ) : (
            <button
              type="button"
              onClick={() => {
                setRows((rs) => [...rs, { name: "Jordan Lee", amount: DUES / 2, paid: 0, late: true }]);
                setLateAdded(true);
              }}
              className="text-[12px] font-medium text-accent hover:underline"
            >
              Jordan joined after this went out. Charge half.
            </button>
          )}
          <button
            type="button"
            disabled={unpaid.length === 0 || reminded}
            onClick={() => setReminded(true)}
            className="flex items-center gap-1.5 rounded-md bg-accent px-2.5 py-1 text-[12px] font-medium text-on-accent transition-opacity disabled:opacity-40"
          >
            <Send className="size-3" aria-hidden />
            {reminded ? `Reminded ${unpaid.length}` : `Remind ${unpaid.length} unpaid`}
          </button>
        </div>
      </Panel>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: "positive" | "warning" }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <p className="text-[12px] text-ink-3">{label}</p>
      <p className={cx("mt-0.5 text-lg font-semibold tnum transition-colors", tone === "positive" ? "text-positive" : tone === "warning" ? "text-warning" : "text-ink")}>{value}</p>
    </div>
  );
}

const ATTENDANCE = {
  "8w": [72, 81, 64, 78, 85, 70, 88, 79],
  semester: [68, 74, 71, 80, 63, 77, 82, 75, 69, 84, 79, 86, 73, 90, 81],
};

function PresidentView() {
  const [range, setRange] = useState<keyof typeof ATTENDANCE>("8w");
  const [hover, setHover] = useState<number | null>(null);
  const series = ATTENDANCE[range];
  const avg = Math.round(series.reduce((s, v) => s + v, 0) / series.length);
  const tiles: Array<{ icon: LucideIcon; label: string; value: string; hint: string; tone?: "accent" | "warning" }> = [
    { icon: UsersRound, label: "Active members", value: "48", hint: "3 joined this month" },
    { icon: HandCoins, label: "Dues collected", value: "82%", hint: "$3,850 outstanding", tone: "accent" },
    { icon: CalendarCheck, label: "Attendance", value: `${avg}%`, hint: range === "8w" ? "Last 8 weeks" : "This semester" },
    { icon: ListChecks, label: "Open tasks", value: "5", hint: "2 past due", tone: "warning" },
  ];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-line bg-surface p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-ink-3">{t.label}</span>
              <span className={cx("grid size-6 place-items-center rounded-md", t.tone === "accent" ? "bg-accent-soft text-accent" : t.tone === "warning" ? "bg-warning/10 text-warning" : "bg-subtle text-ink-2")}>
                <t.icon className="size-3.5" aria-hidden />
              </span>
            </div>
            <p className="mt-1.5 text-xl font-semibold text-ink tnum">{t.value}</p>
            <p className="truncate text-[11px] text-ink-3">{t.hint}</p>
          </div>
        ))}
      </div>
      <Panel
        title="Chapter meeting attendance"
        action={
          <div className="flex rounded-md border border-line p-0.5 text-[11px]">
            {(["8w", "semester"] as const).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => {
                  setRange(r);
                  setHover(null);
                }}
                className={cx("rounded px-2 py-0.5 transition-colors", range === r ? "bg-subtle text-ink" : "text-ink-3 hover:text-ink-2")}
              >
                {r === "8w" ? "8 weeks" : "Semester"}
              </button>
            ))}
          </div>
        }
      >
        <div className="px-4 pb-3 pt-4">
          <div className="relative flex h-36 items-end gap-1.5" onMouseLeave={() => setHover(null)}>
            <span className="pointer-events-none absolute inset-x-0 border-t border-dashed border-line-strong" style={{ bottom: `${avg}%` }} aria-hidden />
            {series.map((v, i) => (
              <button
                key={`${range}-${i}`}
                type="button"
                onMouseEnter={() => setHover(i)}
                onFocus={() => setHover(i)}
                aria-label={`Week ${i + 1}: ${v}% attended`}
                className="group relative flex h-full flex-1 items-end"
              >
                <span
                  className={cx("block w-full rounded-t-sm transition-all duration-300", hover === i ? "bg-accent" : v >= 80 ? "bg-accent/70" : "bg-accent/35")}
                  style={{ height: `${v}%` }}
                />
              </button>
            ))}
          </div>
          <p className="mt-2 h-4 text-[12px] text-ink-3 tnum" aria-live="polite">
            {hover === null ? `Average ${avg}%. Point at a week for details.` : `Week ${hover + 1}: ${series[hover]}% of required members attended`}
          </p>
        </div>
      </Panel>
    </div>
  );
}

type Rsvp = "going" | "maybe" | "no";

const EVENTS = [
  { id: "meeting", title: "Chapter meeting", when: "Sun 7:00 PM", required: true },
  { id: "service", title: "Food bank shift", when: "Sat 10:00 AM", required: false },
  { id: "formal", title: "Fall formal", when: "Nov 14", required: false },
];

function MemberView() {
  const [paid, setPaid] = useState(false);
  const [rsvp, setRsvp] = useState<Record<string, Rsvp | undefined>>({ meeting: "going" });
  const [todo, setTodo] = useState<Record<string, boolean>>({});
  const todos = ["Acknowledge the risk policy", "Finish new member training", "Log service hours"];
  const left = todos.filter((t) => !todo[t]).length;
  return (
    <div className="grid gap-4 md:grid-cols-[1fr_1.15fr]">
      <div className="space-y-4">
        <Panel title="Your balance">
          <div className="px-4 py-4">
            <p className={cx("text-3xl font-semibold tracking-tight tnum transition-colors", paid ? "text-positive" : "text-ink")}>{formatCents(paid ? 0 : 22_500)}</p>
            <p className="mt-0.5 text-[12px] text-ink-3">{paid ? "All paid up. A receipt is in your inbox." : "Spring dues, installment 2 of 2 · due Oct 30"}</p>
            <button
              type="button"
              onClick={() => setPaid((p) => !p)}
              className={cx(
                "mt-4 w-full rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                paid ? "border border-line text-ink-3 hover:text-ink-2" : "bg-accent text-on-accent hover:bg-accent-hover",
              )}
            >
              {paid ? "Undo" : "Pay $225.00"}
            </button>
          </div>
        </Panel>
        <Panel title="To do" action={<span className="text-[11px] text-ink-3 tnum">{left} left</span>}>
          <ul className="divide-y divide-line">
            {todos.map((t) => (
              <li key={t}>
                <button type="button" onClick={() => setTodo((s) => ({ ...s, [t]: !s[t] }))} className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left">
                  <span className={cx("grid size-4 shrink-0 place-items-center rounded border transition-colors", todo[t] ? "border-accent bg-accent text-on-accent" : "border-line-strong")}>
                    {todo[t] ? <Check className="size-3" aria-hidden /> : null}
                  </span>
                  <span className={cx("text-[13px] transition-colors", todo[t] ? "text-ink-3 line-through" : "text-ink")}>{t}</span>
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
      <Panel title="Coming up">
        <ul className="divide-y divide-line">
          {EVENTS.map((e) => (
            <li key={e.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-medium text-ink">{e.title}</p>
                  <p className="text-[11px] text-ink-3">{e.when}{e.required ? " · attendance required" : ""}</p>
                </div>
              </div>
              <div className="mt-2 flex gap-1.5">
                {(["going", "maybe", "no"] as const).map((s) => (
                  <button
                    key={s}
                    type="button"
                    aria-pressed={rsvp[e.id] === s}
                    onClick={() => setRsvp((r) => ({ ...r, [e.id]: r[e.id] === s ? undefined : s }))}
                    className={cx(
                      "rounded-full border px-2.5 py-0.5 text-[11px] transition-colors",
                      rsvp[e.id] === s
                        ? s === "going" ? "border-positive/50 bg-positive/10 text-positive" : s === "maybe" ? "border-warning/50 bg-warning/10 text-warning" : "border-line-strong bg-subtle text-ink-2"
                        : "border-line text-ink-3 hover:text-ink-2",
                    )}
                  >
                    {s === "going" ? "Going" : s === "maybe" ? "Maybe" : "Can't go"}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
        <div className="border-t border-line px-4 py-3">
          <div className="flex justify-between text-[12px]">
            <span className="text-ink-3">Your attendance</span>
            <span className="font-semibold text-ink tnum">92%</span>
          </div>
          <div className="mt-1.5">
            <Bar value={92} tone="positive" />
          </div>
        </div>
      </Panel>
    </div>
  );
}

type SampleRoom = { name: string; floor: string; capacity: number; residents: string[] };

const ROOMS: SampleRoom[] = [
  { name: "201", floor: "Second", capacity: 2, residents: ["Marcus Hill", "Devin Ortiz"] },
  { name: "202", floor: "Second", capacity: 2, residents: ["Chris Nguyen"] },
  { name: "301", floor: "Third", capacity: 3, residents: ["Sam Patel"] },
  { name: "Attic", floor: "Fourth", capacity: 1, residents: [] },
];

const WAITING = ["Jordan Lee", "Alex Rivera", "Ben Carter"];

function HousingView() {
  const [rooms, setRooms] = useState(ROOMS);
  const [waiting, setWaiting] = useState(WAITING);
  const [picked, setPicked] = useState<string | null>(WAITING[0]);
  const [last, setLast] = useState<string | null>(null);
  const beds = rooms.reduce((s, r) => s + r.capacity, 0);
  const filled = rooms.reduce((s, r) => s + r.residents.length, 0);
  const place = (room: SampleRoom) => {
    if (!picked || room.residents.length >= room.capacity) return;
    setRooms((rs) => rs.map((r) => (r.name === room.name ? { ...r, residents: [...r.residents, picked] } : r)));
    const rest = waiting.filter((w) => w !== picked);
    setWaiting(rest);
    setLast(`${picked} moves into ${room.name}. They were notified.`);
    setPicked(rest[0] ?? null);
  };
  const reset = () => {
    setRooms(ROOMS);
    setWaiting(WAITING);
    setPicked(WAITING[0]);
    setLast(null);
  };
  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <Stat label="Living in house" value={filled} />
        <Stat label="Open beds" value={beds - filled} tone={beds - filled === 0 ? "positive" : undefined} />
        <Stat label="Occupancy" value={`${Math.round((filled / beds) * 100)}%`} />
      </div>
      <Panel
        title="Waiting for a room"
        action={
          <button type="button" onClick={reset} className="text-[12px] text-ink-3 hover:text-ink-2">
            Reset
          </button>
        }
      >
        <div className="flex min-h-12 flex-wrap items-center gap-1.5 px-4 py-3">
          {waiting.length === 0 ? <span className="text-[12px] text-ink-3">Everyone is placed.</span> : null}
          {waiting.map((w) => (
            <button
              key={w}
              type="button"
              aria-pressed={picked === w}
              onClick={() => setPicked(w)}
              className={cx("rounded-full border px-2.5 py-1 text-[12px] transition-colors", picked === w ? "border-accent/60 bg-accent/10 text-ink" : "border-line text-ink-3 hover:text-ink-2")}
            >
              {w}
            </button>
          ))}
        </div>
      </Panel>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {rooms.map((r) => {
          const open = r.capacity - r.residents.length;
          const can = Boolean(picked) && open > 0;
          return (
            <button
              key={r.name}
              type="button"
              onClick={() => place(r)}
              disabled={!can}
              className={cx(
                "rounded-lg border bg-surface p-3 text-left transition-colors",
                can ? "border-accent/40 hover:border-accent hover:bg-accent/5" : "border-line",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[13px] font-semibold text-ink">{r.name}</p>
                  <p className="text-[11px] text-ink-3">{r.floor} floor</p>
                </div>
                <span className="flex gap-1 pt-1" aria-label={`${r.residents.length} of ${r.capacity} beds filled`}>
                  {Array.from({ length: r.capacity }, (_, i) => (
                    <span key={i} className={cx("size-2 rounded-full transition-colors", i < r.residents.length ? "bg-accent" : "border border-line-strong")} />
                  ))}
                </span>
              </div>
              <ul className="mt-2 min-h-10 space-y-0.5">
                {r.residents.map((p) => (
                  <li key={p} className="truncate text-[11px] text-ink-2">{p}</li>
                ))}
                {open > 0 ? <li className="text-[11px] text-ink-3">{open} open</li> : null}
              </ul>
            </button>
          );
        })}
      </div>
      <p className="h-4 text-[12px] text-ink-3" aria-live="polite">{last ?? ""}</p>
    </div>
  );
}
