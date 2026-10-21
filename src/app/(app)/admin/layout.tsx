import { ChapterNav, type NavGroup } from "@/components/chapter-nav";
import { requireStaff, type StaffRole } from "@/lib/auth";

const ROLE_LABEL: Record<StaffRole, string> = { admin: "Administrator", reviewer: "Reviewer", support: "Support", finance: "Finance" };

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const { role } = await requireStaff(["reviewer", "support", "finance"]);
  const has = (r: StaffRole) => role === "admin" || role === r;
  const groups: NavGroup[] = [];
  if (has("reviewer")) groups.push({ label: "Trust", items: [{ key: "verification", label: "Verification queue", href: "/admin/verification" }] });
  if (has("support") || has("reviewer")) groups.push({ items: [{ key: "chapters", label: "Chapters", href: "/admin/chapters" }] });
  if (has("finance")) {
    groups.push({
      label: "Finance",
      items: [
        { key: "revenue", label: "Revenue", href: "/admin/revenue" },
        { key: "reconciliation", label: "Reconciliation", href: "/admin/reconciliation" },
      ],
    });
  }
  if (role === "admin") {
    groups.push({
      label: "Platform",
      items: [
        { key: "pricing", label: "Pricing", href: "/admin/pricing" },
        { key: "audit", label: "Audit log", href: "/admin/audit" },
      ],
    });
  }
  return (
    <div className="flex flex-1">
      <aside className="hidden w-60 shrink-0 border-r border-line bg-surface lg:block">
        <div className="sticky top-14 px-3 py-5">
          <div className="mb-5 px-3">
            <p className="text-sm font-semibold text-ink">Platform admin</p>
            <p className="text-[12px] text-ink-3">Signed in as {ROLE_LABEL[role].toLowerCase()}</p>
          </div>
          <ChapterNav groups={groups} />
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <details className="border-b border-line bg-surface lg:hidden">
          <summary className="cursor-pointer list-none px-4 py-3 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            Platform admin <span className="text-ink-3">· Menu</span>
          </summary>
          <div className="px-2 pb-4">
            <ChapterNav groups={groups} />
          </div>
        </details>
        <main className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">{children}</main>
      </div>
    </div>
  );
}
