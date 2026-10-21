import Link from "next/link";
import { Search, Upload, UserPlus, Users, X } from "lucide-react";
import { Avatar, RoleBadges, personName, type RoleChip } from "@/components/people";
import { Badge, Card, CardBody, CardHeader, EmptyState, Input, Notice, Table, Td, Th, TextLink, Tr, buttonClass } from "@/components/ui";
import { ConfirmSubmit } from "@/components/forms";
import { requireChapter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { MEMBER_CLASS_LABEL, MEMBERSHIP_STATUS_LABEL, type MemberClass, type MembershipStatus } from "@/lib/permissions";
import { grantableRoles, listChapterRoles } from "@/lib/roles";
import { formatDate, requestTime } from "@/lib/format";
import { loadRecruiterCredits } from "@/lib/recruiters";
import { importMembers, inviteMember, revokeInvitation } from "./actions";
import { ImportForm, InviteForm } from "./member-forms";

const STATUS_FILTERS = [
  { value: "", label: "Current" },
  { value: "suspended", label: "Suspended" },
  { value: "ended", label: "Former" },
] as const;

type DirectoryRow = {
  membership_id: string;
  user_id: string;
  display_name: string | null;
  full_name: string | null;
  avatar_path: string | null;
  member_class: MemberClass;
  status: MembershipStatus;
  joined_at: string;
  roles: RoleChip[];
  in_house?: boolean | null;
  total_count: number;
};

export default async function MembersSettingsPage({ params, searchParams }: PageProps<"/c/[slug]/settings/members">) {
  const { slug } = await params;
  const sp = await searchParams;
  const ctx = await requireChapter(slug, "members.manage");
  const { chapter } = ctx;
  const q = typeof sp.q === "string" ? sp.q.slice(0, 80) : "";
  const status = STATUS_FILTERS.find((f) => f.value === sp.status)?.value ?? "";
  const supabase = await createClient();
  const [{ data: members }, { data: invites }, roles, credits] = await Promise.all([
    supabase.rpc("chapter_directory", { p_chapter: chapter.id, p_search: q || null, p_class: null, p_role: null, p_status: status || null, p_limit: 200, p_offset: 0 }),
    supabase
      .from("chapter_invitations")
      .select("id, email, full_name, member_class, role_keys, created_at, expires_at")
      .eq("chapter_id", chapter.id)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(200),
    listChapterRoles(chapter.id),
    loadRecruiterCredits(chapter.id),
  ]);
  const rows = (members ?? []) as DirectoryRow[];
  const total = rows[0]?.total_count ?? 0;
  const grantable = grantableRoles(roles, ctx.permissions).map((r) => ({ key: r.key, id: r.id, name: r.name }));
  const roleName = new Map(roles.map((r) => [r.key, r.name]));
  const base = `/c/${slug}/settings/members`;
  const now = requestTime();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
      <div className="order-2 space-y-6 lg:order-1">
        {chapter.status !== "verified" ? <Notice tone="warning">Invitations open once the chapter is verified.</Notice> : null}
        <Card>
          <CardHeader title="Members" description={`${total} ${status === "ended" ? "former" : status === "suspended" ? "suspended" : "current"} member${total === 1 ? "" : "s"}`} />
          <CardBody className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <nav className="flex gap-1" aria-label="Filter members">
                {STATUS_FILTERS.map((f) => (
                  <Link
                    key={f.value}
                    href={f.value ? `${base}?status=${f.value}` : base}
                    className={buttonClass(status === f.value ? "secondary" : "ghost", "sm")}
                    aria-current={status === f.value ? "page" : undefined}
                  >
                    {f.label}
                  </Link>
                ))}
              </nav>
              <form className="relative w-full sm:w-64" action={base}>
                {status ? <input type="hidden" name="status" value={status} /> : null}
                <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-ink-3" aria-hidden />
                <Input name="q" defaultValue={q} placeholder="Search by name" className="pl-8" aria-label="Search members" />
              </form>
            </div>
            {rows.length === 0 ? (
              <EmptyState icon={Users} title={q ? "No one matches that search" : "No members here"}>
                {q ? <TextLink href={status ? `${base}?status=${status}` : base}>Clear search</TextLink> : "Add people with the form on this page."}
              </EmptyState>
            ) : (
              <div className="-mx-5 overflow-x-auto">
                <Table>
                  <thead>
                    <tr>
                      <Th className="pl-5">Name</Th>
                      <Th>Class</Th>
                      <Th>Roles</Th>
                      {credits ? <Th>Recruited by</Th> : null}
                      <Th>Joined</Th>
                      <Th className="pr-5" align="right"><span className="sr-only">Manage</span></Th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((m) => (
                      <Tr key={m.membership_id}>
                        <Td className="pl-5">
                          <span className="flex items-center gap-2.5">
                            <Avatar name={personName(m)} path={m.avatar_path} />
                            <span className="min-w-0">
                              <span className="block truncate font-medium text-ink">{personName(m)}</span>
                              {m.full_name && m.display_name && m.display_name !== m.full_name ? <span className="block truncate text-xs text-ink-3">{m.full_name}</span> : null}
                            </span>
                          </span>
                        </Td>
                        <Td>
                          {MEMBER_CLASS_LABEL[m.member_class]}
                          {m.member_class === "active" && typeof m.in_house === "boolean" ? (
                            <Badge className="ml-1.5" tone={m.in_house ? "positive" : "neutral"}>{m.in_house ? "In house" : "Out of house"}</Badge>
                          ) : null}
                          {m.status === "inactive" ? <Badge className="ml-1.5">{MEMBERSHIP_STATUS_LABEL.inactive}</Badge> : null}
                        </Td>
                        <Td><RoleBadges roles={m.roles} /></Td>
                        {credits ? (
                          <Td className="whitespace-nowrap text-ink-2">
                            {credits.get(m.membership_id)?.recruiterName ?? <span className="text-ink-3">{credits.has(m.membership_id) ? "Not sure" : "Not recorded"}</span>}
                          </Td>
                        ) : null}
                        <Td className="whitespace-nowrap text-ink-2">{formatDate(m.joined_at, chapter.timezone)}</Td>
                        <Td className="pr-5" align="right">
                          <Link href={`${base}/${m.membership_id}`} className={buttonClass("ghost", "sm")}>Manage</Link>
                        </Td>
                      </Tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Pending invitations" description="Links expire 14 days after sending." />
          {(invites ?? []).length === 0 ? (
            <CardBody><p className="text-sm text-ink-3">No pending invitations.</p></CardBody>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <thead>
                  <tr>
                    <Th className="pl-5">Email</Th>
                    <Th>Class</Th>
                    <Th>Roles</Th>
                    <Th>Expires</Th>
                    <Th className="pr-5" align="right"><span className="sr-only">Revoke</span></Th>
                  </tr>
                </thead>
                <tbody>
                  {(invites ?? []).map((inv) => {
                    const expired = new Date(inv.expires_at as string).getTime() < now;
                    return (
                      <Tr key={inv.id as string}>
                        <Td className="pl-5">
                          <span className="block font-medium text-ink">{inv.email as string}</span>
                          {inv.full_name ? <span className="block text-xs text-ink-3">{inv.full_name as string}</span> : null}
                        </Td>
                        <Td>{MEMBER_CLASS_LABEL[inv.member_class as MemberClass]}</Td>
                        <Td className="text-ink-2">{((inv.role_keys as string[]) ?? []).map((k) => roleName.get(k) ?? k).join(", ") || <span className="text-ink-3">None</span>}</Td>
                        <Td className="whitespace-nowrap">{expired ? <Badge tone="warning">Expired</Badge> : formatDate(inv.expires_at as string, chapter.timezone)}</Td>
                        <Td className="pr-5" align="right">
                          <form action={revokeInvitation.bind(null, slug, inv.id as string)}>
                            <ConfirmSubmit message={`Revoke the invitation for ${inv.email}?`} variant="ghost">
                              <X className="size-4" aria-hidden />
                              Revoke
                            </ConfirmSubmit>
                          </form>
                        </Td>
                      </Tr>
                    );
                  })}
                </tbody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      <div className="order-1 space-y-6 lg:order-2">
        <Card id="add">
          <CardHeader
            title={<span className="flex items-center gap-2"><UserPlus className="size-4 text-ink-3" aria-hidden />Add a member</span>}
            description="If they already have an account, they are added right away. Otherwise they get an invitation link and join when they sign up."
          />
          <CardBody>
            <InviteForm action={inviteMember.bind(null, slug)} roles={grantable} />
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={<span className="flex items-center gap-2"><Upload className="size-4 text-ink-3" aria-hidden />Import from a spreadsheet</span>}
            description="Everyone on the list gets an invitation. Nobody is added until they accept."
          />
          <CardBody>
            <ImportForm action={importMembers.bind(null, slug)} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
