import Link from "next/link";
import { Bell, ChevronDown, LogOut, Shield, UserRound } from "lucide-react";
import { Wordmark } from "@/components/brand";
import { signOut } from "@/app/(auth)/actions";
import { initials } from "@/lib/names";

export function AppHeader({
  name,
  email,
  unread,
  isStaff,
  context,
}: {
  name: string;
  email: string;
  unread: number;
  isStaff: boolean;
  context?: React.ReactNode;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-line bg-surface">
      <div className="flex h-14 items-center gap-4 px-4 sm:px-6">
        <Wordmark href="/home" />
        {context ? <div className="flex min-w-0 items-center gap-2 border-l border-line pl-4">{context}</div> : null}
        <div className="ml-auto flex items-center gap-1">
          {isStaff ? (
            <Link href="/admin" className="hidden items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[13px] text-ink-2 hover:bg-subtle hover:text-ink sm:inline-flex">
              <Shield className="size-4" aria-hidden />
              Platform admin
            </Link>
          ) : null}
          <Link href="/notifications" className="relative rounded-md p-2 text-ink-2 hover:bg-subtle hover:text-ink" aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}>
            <Bell className="size-[18px]" aria-hidden />
            {unread > 0 ? (
              <span className="absolute right-1 top-1 min-w-4 rounded-full bg-danger px-1 text-center text-[10px] font-semibold leading-4 text-on-accent tnum">
                {unread > 99 ? "99+" : unread}
              </span>
            ) : null}
          </Link>
          <details className="group relative">
            <summary className="flex cursor-pointer list-none items-center gap-2 rounded-md py-1 pl-1 pr-2 hover:bg-subtle [&::-webkit-details-marker]:hidden">
              <span className="grid size-7 place-items-center rounded-full bg-accent-soft text-[11px] font-semibold text-accent">{initials(name || email)}</span>
              <ChevronDown className="size-3.5 text-ink-3" aria-hidden />
            </summary>
            <div className="absolute right-0 mt-1 w-60 rounded-md border border-line bg-surface p-1 shadow-lg shadow-black/60">
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-ink">{name || "Your account"}</p>
                <p className="truncate text-[12px] text-ink-3">{email}</p>
              </div>
              <div className="my-1 border-t border-line" />
              <Link href="/account" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-ink-2 hover:bg-subtle hover:text-ink">
                <UserRound className="size-4" aria-hidden />
                Account settings
              </Link>
              {isStaff ? (
                <Link href="/admin" className="flex items-center gap-2 rounded px-3 py-2 text-sm text-ink-2 hover:bg-subtle hover:text-ink sm:hidden">
                  <Shield className="size-4" aria-hidden />
                  Platform admin
                </Link>
              ) : null}
              <form action={signOut}>
                <button type="submit" className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm text-ink-2 hover:bg-subtle hover:text-ink">
                  <LogOut className="size-4" aria-hidden />
                  Sign out
                </button>
              </form>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
