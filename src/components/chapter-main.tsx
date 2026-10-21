"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { BackButton } from "@/components/back-button";

export function ChapterMain({ base, children }: { base: string; children: ReactNode }) {
  const pathname = usePathname();
  const chat = `${base}/chat`;
  if (pathname === chat || pathname.startsWith(`${chat}/`)) {
    return <main className="flex min-h-0 min-w-0 flex-1 flex-col">{children}</main>;
  }
  return (
    <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <BackButton base={base} />
      {children}
    </main>
  );
}
