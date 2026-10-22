import { describe, expect, it } from "vitest";
import { contactStatus, durationLabel, isoToZonedInput, outreachEmail, parseContacts, zonedInputToIso } from "@/lib/outreach";

describe("outreach email", () => {
  it("fills in the first name, council, and university", () => {
    const { subject, body } = outreachEmail({ full_name: "Margarita Lopez", organization: "MGC", university: "Texas Christian University" }, "https://greekgeek.org/intro/tcu");
    expect(subject).toBe("GreekGeek for MGC at Texas Christian University");
    expect(body.startsWith("Hi Margarita,\n\nMy name is Amare Carey")).toBe(true);
    expect(body).toContain("We'd love to introduce GreekGeek to MGC leadership at Texas Christian University and see whether it could help.");
    expect(body).toContain("• Dues collection and chapter finances\n• Member directories and officer management");
    expect(body).toContain("Tell us about your chapter: https://greekgeek.org/intro/tcu");
    expect(body.endsWith("Best,\nAmare Carey\nCo-Founder, GreekGeek\namare@greekgeek.org\nhttps://greekgeek.org")).toBe(true);
  });

  it("greets an office without a name", () => {
    expect(outreachEmail({ full_name: null, organization: "Fraternity and Sorority Life", university: "University of Kansas" }).body.startsWith("Hi there,")).toBe(true);
  });
});

describe("contact import", () => {
  it("reads commas, tabs, quotes, and a header row", () => {
    const { contacts, skipped } = parseContacts(
      [
        "university,council,role,name,email,link",
        '"University of Missouri, Columbia",IFC,President,Jordan Lee,jlee@missouri.edu,https://greek.missouri.edu',
        "University of Kansas\tPanhellenic\t\t\tpanhel@ku.edu",
        "Bad Row,IFC,President,No Email,not-an-email",
        "Duplicate,IFC,President,Jordan,JLEE@missouri.edu",
      ].join("\n"),
    );
    expect(contacts).toEqual([
      { university: "University of Missouri, Columbia", organization: "IFC", role: "President", full_name: "Jordan Lee", email: "jlee@missouri.edu", source_url: "https://greek.missouri.edu" },
      { university: "University of Kansas", organization: "Panhellenic", role: "President", full_name: null, email: "panhel@ku.edu", source_url: null },
    ]);
    expect(skipped).toEqual([4, 5]);
  });
});

describe("status and time", () => {
  const base = { do_not_contact: false, emails_sent: 0, replies: 0, bounced_at: null, opened_at: null, delivered_at: null, last_status: null };

  it("ranks a reply above everything else", () => {
    expect(contactStatus(base)).toBe("not_contacted");
    expect(contactStatus({ ...base, last_status: "failed" })).toBe("failed");
    expect(contactStatus({ ...base, emails_sent: 1, delivered_at: "x" })).toBe("delivered");
    expect(contactStatus({ ...base, emails_sent: 1, opened_at: "x" })).toBe("opened");
    expect(contactStatus({ ...base, emails_sent: 1, bounced_at: "x", do_not_contact: true })).toBe("bounced");
    expect(contactStatus({ ...base, emails_sent: 1, replies: 1, do_not_contact: true })).toBe("replied");
  });

  it("converts Central wall time across daylight saving", () => {
    expect(zonedInputToIso("2026-07-01T09:30")).toBe("2026-07-01T14:30:00.000Z");
    expect(zonedInputToIso("2026-12-01T09:30")).toBe("2026-12-01T15:30:00.000Z");
    expect(zonedInputToIso("bad")).toBeNull();
    expect(isoToZonedInput(new Date("2026-12-01T15:30:00Z"))).toBe("2026-12-01T09:30");
  });

  it("labels reply time", () => {
    expect(durationLabel("2026-10-20T15:00:00Z", "2026-10-20T15:40:00Z")).toBe("40m");
    expect(durationLabel("2026-10-20T15:00:00Z", "2026-10-20T20:00:00Z")).toBe("5h");
    expect(durationLabel("2026-10-20T15:00:00Z", "2026-10-23T15:00:00Z")).toBe("3d");
  });
});
