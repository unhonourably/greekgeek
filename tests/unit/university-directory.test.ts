import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const DATA = [
  { name: "University of Michigan", country: "United States", domains: ["umich.edu"], "state-province": "Michigan" },
  { name: "Michigan State University", country: "United States", domains: ["msu.edu"], "state-province": "MI" },
  { name: "Central Michigan University", country: "United States", domains: ["cmich.edu"], "state-province": null },
  { name: "University of California, Los Angeles", country: "United States", domains: ["ucla.edu"], "state-province": "California" },
  { name: "University of Toronto", country: "Canada", domains: ["utoronto.ca"], "state-province": "Ontario" },
  { name: "University of Michigan", country: "United States", domains: ["umich.edu"], "state-province": "Michigan" },
  { name: "Bad Domain College", country: "United States", domains: ["not a domain"], "state-province": "Nowhere" },
];

describe("university directory", () => {
  let fetchMock: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.resetModules();
    fetchMock = vi.fn(async () => new Response(JSON.stringify(DATA), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns US schools ranked by relevance with state codes and email domains", async () => {
    const { searchUniversityDirectory } = await import("@/lib/university-directory");
    const r = await searchUniversityDirectory("university of michigan", 5, 1000);
    expect(r[0]).toEqual({ name: "University of Michigan", slug: "university-of-michigan", state: "MI", email_domains: ["umich.edu"] });
    expect(r.map((u) => u.name)).toEqual(["University of Michigan", "Michigan State University", "Central Michigan University"]);
    expect((await searchUniversityDirectory("university of california los angeles", 5, 1000))[0]?.name).toBe("University of California, Los Angeles");
    const michigan = await searchUniversityDirectory("michigan", 10, 1000);
    expect(michigan.map((u) => u.name)).toHaveLength(3);
    expect(michigan.find((u) => u.name === "Michigan State University")?.state).toBe("MI");
    expect(michigan.find((u) => u.name === "Central Michigan University")?.state).toBeNull();
    expect(await searchUniversityDirectory("toronto", 5, 1000)).toEqual([]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("matches by email domain and drops invalid domains", async () => {
    const { searchUniversityDirectory } = await import("@/lib/university-directory");
    expect((await searchUniversityDirectory("ucla", 5, 1000))[0]?.name).toBe("University of California, Los Angeles");
    expect((await searchUniversityDirectory("umich.edu", 5, 1000))[0]?.name).toBe("University of Michigan");
    expect((await searchUniversityDirectory("bad domain", 5, 1000))[0]).toEqual({ name: "Bad Domain College", slug: "bad-domain-college", state: null, email_domains: [] });
  });

  it("ignores short queries and survives an unavailable source", async () => {
    fetchMock.mockImplementation(async () => new Response("down", { status: 503 }));
    const { searchUniversityDirectory } = await import("@/lib/university-directory");
    expect(await searchUniversityDirectory("m", 5, 1000)).toEqual([]);
    expect(await searchUniversityDirectory("michigan", 5, 1000)).toEqual([]);
  });
});
