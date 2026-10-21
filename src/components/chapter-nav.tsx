"use client";

import Link, { useLinkStatus } from "next/link";
import { usePathname } from "next/navigation";
import {
  Award,
  BookOpen,
  Building2,
  ChartColumn,
  LoaderCircle,
  ScrollText,
  ShieldCheck,
  Tag,
  CalendarDays,
  CreditCard,
  HandHeart,
  House,
  Landmark,
  LayoutDashboard,
  Megaphone,
  MessagesSquare,
  Receipt,
  Scale,
  Settings,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import { cx } from "@/components/ui";

const ICONS = {
  overview: LayoutDashboard,
  chat: MessagesSquare,
  announcements: Megaphone,
  events: CalendarDays,
  directory: Users,
  dues: CreditCard,
  reimbursements: Receipt,
  finances: Wallet,
  payments: Landmark,
  recruitment: UserPlus,
  analytics: ChartColumn,
  philanthropy: HandHeart,
  housing: House,
  standards: Scale,
  academics: BookOpen,
  badges: Award,
  settings: Settings,
  verification: ShieldCheck,
  chapters: Building2,
  revenue: ChartColumn,
  reconciliation: Scale,
  pricing: Tag,
  audit: ScrollText,
} satisfies Record<string, LucideIcon>;

export type NavItem = { key: keyof typeof ICONS; label: string; href: string; badge?: number; exact?: boolean; tag?: string };
export type NavGroup = { label?: string; items: NavItem[] };

export function ChapterNav({ groups }: { groups: NavGroup[] }) {
  const pathname = usePathname();
  const activeHref = groups
    .flatMap((g) => g.items)
    .filter((item) => (item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`)))
    .reduce<string | null>((best, item) => (!best || item.href.length > best.length ? item.href : best), null);
  return (
    <nav aria-label="Sections" className="space-y-5">
      {groups.map((group, i) => (
        <div key={group.label ?? i}>
          {group.label ? <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wide text-ink-3">{group.label}</p> : null}
          <ul className="space-y-px">
            {group.items.map((item) => {
              const Icon = ICONS[item.key];
              const active = item.href === activeHref;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cx(
                      "flex items-center gap-2.5 rounded-md px-3 py-1.5 text-sm",
                      active ? "bg-subtle font-medium text-ink" : "text-ink-2 hover:bg-subtle/70 hover:text-ink",
                    )}
                  >
                    <NavIcon icon={Icon} active={active} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold leading-[18px] text-on-accent tnum">{item.badge > 99 ? "99+" : item.badge}</span> : null}
                    {item.tag ? <span className="rounded-full border border-warning/40 bg-warning/10 px-1.5 text-[11px] font-medium leading-[18px] text-warning">{item.tag}</span> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function SubNav({ items }: { items: Array<{ label: string; href: string; exact?: boolean }> }) {
  const pathname = usePathname();
  return (
    <nav className="-mx-1 mb-6 flex gap-1 overflow-x-auto border-b border-line" aria-label="Section">
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            className={cx(
              "-mb-px whitespace-nowrap border-b-2 px-3 py-2 text-sm",
              active ? "border-accent font-medium text-ink" : "border-transparent text-ink-2 hover:text-ink",
            )}
          >
            <SubNavLabel label={item.label} />
          </Link>
        );
      })}
    </nav>
  );
}

function NavIcon({ icon: Icon, active }: { icon: LucideIcon; active: boolean }) {
  const { pending } = useLinkStatus();
  return pending ? (
    <LoaderCircle className="size-4 shrink-0 animate-spin text-accent" aria-hidden />
  ) : (
    <Icon className={cx("size-4 shrink-0", active ? "text-accent" : "text-ink-3")} aria-hidden />
  );
}

function SubNavLabel({ label }: { label: string }) {
  const { pending } = useLinkStatus();
  return <span className={cx("transition-opacity", pending && "animate-pulse text-ink")}>{label}</span>;
}