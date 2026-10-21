import { Megaphone, Pin } from "lucide-react";
import { Avatar, personName } from "@/components/people";
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui";
import { SubmitButton } from "@/components/forms";
import { requireChapter } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/format";
import { acknowledge, archiveAnnouncement, publishAnnouncement, setPinned } from "./actions";
import { AnnouncementComposer } from "./composer";

type Row = {
  id: string;
  title: string;
  body: string;
  audience: "all" | "officers";
  pinned: boolean;
  requires_ack: boolean;
  published_at: string;
  author: { display_name: string | null; full_name: string | null; avatar_path: string | null } | null;
};

export default async function AnnouncementsPage({ params }: PageProps<"/c/[slug]/announcements">) {
  const { slug } = await params;
  const { chapter, user, can } = await requireChapter(slug);
  const canPublish = can("announcements.publish");
  const supabase = await createClient();
  const { data } = await supabase
    .from("announcements")
    .select("id, title, body, audience, pinned, requires_ack, published_at, author:profiles!announcements_author_id_fkey(display_name, full_name, avatar_path)")
    .eq("chapter_id", chapter.id)
    .is("archived_at", null)
    .order("pinned", { ascending: false })
    .order("published_at", { ascending: false })
    .limit(60);
  const rows = (data ?? []) as unknown as Row[];
  const ackIds = rows.filter((r) => r.requires_ack).map((r) => r.id);
  const acks = new Map<string, number>();
  const mine = new Set<string>();
  let memberCount = 0;
  if (ackIds.length) {
    const { data: ackRows } = await supabase.from("announcement_acks").select("announcement_id, user_id").in("announcement_id", ackIds);
    for (const a of ackRows ?? []) {
      acks.set(a.announcement_id, (acks.get(a.announcement_id) ?? 0) + 1);
      if (a.user_id === user.id) mine.add(a.announcement_id);
    }
    if (canPublish) {
      const { count } = await supabase.from("memberships").select("id", { count: "exact", head: true }).eq("chapter_id", chapter.id).eq("status", "active");
      memberCount = count ?? 0;
    }
  }

  return (
    <>
      <PageHeader title="Announcements" description="Updates from chapter officers. New announcements notify every member." />
      {canPublish ? (
        <Card className="mb-8">
          <CardHeader title="New announcement" />
          <CardBody>
            <AnnouncementComposer action={publishAnnouncement.bind(null, slug)} canOfficers={can("announcements.officers")} />
          </CardBody>
        </Card>
      ) : null}
      {rows.length === 0 ? (
        <Card>
          <EmptyState icon={Megaphone} title="No announcements yet">
            {canPublish ? "Publish the first one above." : "Officer updates will appear here."}
          </EmptyState>
        </Card>
      ) : (
        <div className="space-y-4">
          {rows.map((a) => {
            const name = a.author ? personName(a.author) : "Former member";
            return (
              <Card key={a.id} id={a.id} className="scroll-mt-20">
                <div className="flex items-start gap-3 px-5 pt-4">
                  <Avatar name={name} path={a.author?.avatar_path} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-[15px] font-semibold text-ink">{a.title}</h2>
                      {a.pinned ? (
                        <Badge tone="accent">
                          <Pin className="size-3" aria-hidden />
                          Pinned
                        </Badge>
                      ) : null}
                      {a.audience === "officers" ? <Badge tone="info">Officers only</Badge> : null}
                    </div>
                    <p className="text-[12px] text-ink-3">
                      {name} · {formatDateTime(a.published_at, chapter.timezone)}
                    </p>
                  </div>
                </div>
                <CardBody>
                  <p className="whitespace-pre-wrap text-sm leading-relaxed text-ink-2">{a.body}</p>
                </CardBody>
                {a.requires_ack || canPublish ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
                    <div className="text-[13px] text-ink-3">
                      {a.requires_ack ? (
                        mine.has(a.id) ? (
                          <span className="text-positive">You acknowledged this</span>
                        ) : (
                          <form action={acknowledge.bind(null, slug, a.id)}>
                            <SubmitButton size="sm" pendingLabel="Saving">I have read this</SubmitButton>
                          </form>
                        )
                      ) : null}
                    </div>
                    <div className="flex items-center gap-3">
                      {canPublish && a.requires_ack ? (
                        <span className="text-[13px] text-ink-3 tnum">
                          {acks.get(a.id) ?? 0} of {memberCount} acknowledged
                        </span>
                      ) : null}
                      {canPublish ? (
                        <>
                          <form action={setPinned.bind(null, slug, a.id, !a.pinned)}>
                            <Button type="submit" variant="ghost" size="sm">{a.pinned ? "Unpin" : "Pin"}</Button>
                          </form>
                          <form action={archiveAnnouncement.bind(null, slug, a.id)}>
                            <Button type="submit" variant="ghost" size="sm">Archive</Button>
                          </form>
                        </>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </>
  );
}
