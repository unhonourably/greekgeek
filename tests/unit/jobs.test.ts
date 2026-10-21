import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ adminRpc: vi.fn() }));

let jobs: typeof import("@/lib/jobs");

beforeAll(async () => {
  jobs = await import("@/lib/jobs");
});

afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("cron authorization", () => {
  it("requires the exact bearer secret", () => {
    process.env.CRON_SECRET = "a-long-enough-cron-secret-value";
    expect(jobs.isAuthorizedCron("Bearer a-long-enough-cron-secret-value")).toBe(true);
    expect(jobs.isAuthorizedCron("Bearer a-long-enough-cron-secret-valuX")).toBe(false);
    expect(jobs.isAuthorizedCron("a-long-enough-cron-secret-value")).toBe(false);
    expect(jobs.isAuthorizedCron(null)).toBe(false);
  });

  it("refuses everything when the secret is missing or weak", () => {
    expect(jobs.isAuthorizedCron("Bearer ")).toBe(false);
    process.env.CRON_SECRET = "short";
    expect(jobs.isAuthorizedCron("Bearer short")).toBe(false);
  });

  it("only knows the declared jobs", () => {
    expect(jobs.isJobName("late-fees")).toBe(true);
    expect(jobs.isJobName("toString")).toBe(false);
    expect(jobs.isJobName("drop-tables")).toBe(false);
  });
});

describe("notification emails", () => {
  it("links to the app and refuses off-site links", () => {
    const local = jobs.notificationEmail({ title: "Spring dues is past due", body: "Outstanding balance: $200.00.", link: "/c/alpha/dues" }, "https://app.example.com");
    expect(local.subject).toBe("Spring dues is past due");
    expect(local.text).toContain("Open: https://app.example.com/c/alpha/dues");
    expect(local.text).toContain("Manage email preferences: https://app.example.com/account#notifications");
    const offsite = jobs.notificationEmail({ title: "Hi", body: null, link: "//evil.example" }, "https://app.example.com");
    expect(offsite.text).not.toContain("evil");
  });
});
