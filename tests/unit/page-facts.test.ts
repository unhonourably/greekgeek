import { describe, expect, it } from "vitest";
import { extractFindings, fraternityCountQuote, mergeFindings, sameSchool } from "@/lib/page-facts";
import { readGreekLife } from "@/lib/university-research";

const html = `
  <html><head><title>Greek Life</title></head><body>
    <p>The Interfraternity Council advises Sigma Chi and Beta Theta Pi.</p>
    <p>Sigma Chi chapter dues are $650 per semester for members.</p>
    <p>Beta Theta Pi houses 42 members in the chapter house and 30 out of house.</p>
    <p>Sigma Chi has 240 chapters nationwide.</p>
    <p>Email the president at president@tcu.edu or webmaster@tcu.edu.</p>
  </body></html>
`;

function cloudflare(email: string): string {
  const key = 0x5a;
  return [key, ...[...email].map((char) => char.charCodeAt(0) ^ key)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

describe("greek life page facts", () => {
  it("keeps quoted figures and school emails, and drops the rest", () => {
    const findings = extractFindings(html, "https://www.tcu.edu/greek", ["tcu.edu"], true);
    expect(findings.filter((finding) => finding.kind === "chapter").map((finding) => finding.title)).toEqual(expect.arrayContaining(["Sigma Chi", "Beta Theta Pi", "Interfraternity Council"]));
    expect(findings.find((finding) => finding.kind === "dues")?.quote).toMatch(/\$650/);
    expect(findings.find((finding) => finding.kind === "housing")?.quote).toMatch(/42 members/);
    expect(findings.find((finding) => finding.kind === "national")?.quote).toMatch(/240 chapters/);
    const emails = findings.filter((finding) => finding.kind === "email").map((finding) => finding.title);
    expect(emails).toContain("president@tcu.edu");
    expect(emails).not.toContain("webmaster@tcu.edu");
    expect(emails).not.toContain("admit@tcu.edu");
  });

  it("ignores a homepage email that is not about greek life", () => {
    const findings = extractFindings("<p>Contact admit@tcu.edu for admission.</p>", "https://www.tcu.edu/", ["tcu.edu"], false);
    expect(findings.filter((finding) => finding.kind === "email")).toEqual([]);
  });

  it("quotes a stated fraternity count", () => {
    expect(fraternityCountQuote("<div>50+</div><p>Fraternities and sororities</p>")).toBe("50+ Fraternities and sororities");
  });

  it("does not treat campus marketing numbers as dues or membership", () => {
    const marketing = "<p>An All-Inclusive Experience. $0 Cost for students to attend sporting events on campus.</p><p>Personalized attention. 1/2 of classes have fewer than 30 students.</p><p>A nationally-ranked academic community in the Big 12.</p>";
    const findings = extractFindings(marketing, "https://www.tcu.edu/", ["tcu.edu"], false);
    expect(findings).toEqual([]);
  });

  it("reads emails hidden behind links, protection and spelled-out forms", () => {
    const page = `
      <div class="staff"><h3>Preston Kell</h3><p>Coordinator, Interfraternity Council</p><a href="mailto:pkell@clemson.edu?subject=Hi">Email</a></div>
      <div class="staff"><h3>Rachel Weise</h3><p>Graduate Assistant</p><a href="/cdn-cgi/l/email-protection#${cloudflare("rweise@clemson.edu")}">[email&#160;protected]</a></div>
      <p>Panhellenic: panhellenic [at] clemson [dot] edu</p>
      <p>Office: greek&#64;clemson.edu</p>
      <p>Help desk: ithelp@clemson.edu</p>
      <p>Alpha Omega Epsilon <a href="mailto:bama.aoe@gmail.com">bama.aoe@gmail.com</a></p>
      <p>Random <a href="mailto:someone@gmail.com">someone@gmail.com</a></p>
    `;
    const emails = extractFindings(page, "https://www.clemson.edu/fsl/contact", ["clemson.edu"], true).filter((finding) => finding.kind === "email");
    const byEmail = new Map(emails.map((finding) => [finding.title, finding.detail]));
    expect(byEmail.get("pkell@clemson.edu")).toBe("Coordinator · Interfraternity Council · Preston Kell");
    expect(byEmail.get("rweise@clemson.edu")).toMatch(/^Graduate Assistant · .+ · Rachel Weise$/);
    expect(byEmail.has("panhellenic@clemson.edu")).toBe(true);
    expect(byEmail.has("greek@clemson.edu")).toBe(true);
    expect(byEmail.get("bama.aoe@gmail.com")).toBe("Greek life office · Alpha Omega Epsilon");
    expect(byEmail.has("ithelp@clemson.edu")).toBe(false);
    expect(byEmail.has("someone@gmail.com")).toBe(false);
  });

  it("only follows the school's own site", () => {
    expect(sameSchool("www.tcu.edu", "tcu.edu")).toBe(true);
    expect(sameSchool("greeklife.tcu.edu", "tcu.edu")).toBe(true);
    expect(sameSchool("tcu.edu.evil.test", "tcu.edu")).toBe(false);
    expect(sameSchool("127.0.0.1", "tcu.edu")).toBe(false);
    expect(sameSchool("localhost", "tcu.edu")).toBe(false);
  });
});

describe("reading one school", () => {
  it("reads the homepage and the greek page it links to", async () => {
    const home = `<html><head><title>TCU</title></head><body><a href="/greek-life">Student life</a><p>Email admit@tcu.edu about admission.</p></body></html>`;
    const greek = html;
    const fetchImpl = async (url: string) => {
      const ok = url === "https://www.tcu.edu" || url === "https://www.tcu.edu/" || url.includes("/greek-life");
      const body = url.includes("/greek-life") ? greek : home;
      return new Response(ok ? body : "Missing", { status: ok ? 200 : 404, headers: { "content-type": "text/html" } });
    };
    const result = await readGreekLife(["tcu.edu"], fetchImpl as typeof fetch, 5_000);
    expect(result.error).toBeNull();
    expect(result.pages.some((page) => page.ok && page.url.includes("greek"))).toBe(true);
    expect(mergeFindings([result.findings]).some((finding) => finding.title === "president@tcu.edu")).toBe(true);
    expect(result.findings.some((finding) => finding.title === "admit@tcu.edu")).toBe(false);
  });

  it("reads greek chapters from a public organization directory", async () => {
    const home = `<html><head><title>TCU</title></head><body><a href="https://engage.tcu.edu/organizations">Organizations</a><p>$0 cost for sporting events. 30 students in a class. A nationally-ranked campus in the Big 12.</p></body></html>`;
    const search = JSON.stringify({
      value: [
        { Id: "1", Name: "Zeta Tau Alpha", CategoryNames: ["Panhellenic Council"], Status: "Active", Visibility: "Public", WebsiteKey: "zta", Summary: "The Gamma Psi Chapter has 120 members." },
        { Id: "2", Name: "Club Volleyball", CategoryNames: ["Sport Clubs"], Status: "Active", Visibility: "Public", WebsiteKey: "vb", Summary: "A club with 30 members." },
        { Id: "3", Name: "Kappa Kappa Gamma", CategoryNames: [], Status: "Active", Visibility: "Public", WebsiteKey: "kkg", Summary: "The Epsilon Beta chapter." },
        { Id: "4", Name: "Kappa Delta Pi Education Honor Society", CategoryNames: ["Academic/Honors Society"], Status: "Active", Visibility: "Public", WebsiteKey: "kdp", Summary: "An honor society." },
      ],
    });
    const detail = JSON.stringify({
      name: "Zeta Tau Alpha",
      email: "grace.flesher@tcu.edu",
      summary: "The Gamma Psi Chapter has 120 members.",
      description: "<p>Chapter dues are $650 per semester.</p>",
      primaryContact: { firstName: "Grace", lastName: "Flesher", primaryEmailAddress: "grace.flesher@tcu.edu" },
      websiteKey: "zta",
    });
    const fetchImpl = async (url: string) => {
      if (url === "https://www.tcu.edu" || url === "https://www.tcu.edu/") return new Response(home, { status: 200, headers: { "content-type": "text/html" } });
      if (url.includes("/api/discovery/search/organizations")) return new Response(search, { status: 200, headers: { "content-type": "application/json" } });
      if (url.endsWith("/api/discovery/organization/1")) return new Response(detail, { status: 200, headers: { "content-type": "application/json" } });
      return new Response("Missing", { status: 404, headers: { "content-type": "text/html" } });
    };
    const result = await readGreekLife(["tcu.edu"], fetchImpl as typeof fetch, 8_000);
    expect(result.findings.some((finding) => finding.kind === "chapter" && finding.title === "Zeta Tau Alpha")).toBe(true);
    expect(result.findings.some((finding) => finding.title === "Club Volleyball")).toBe(false);
    expect(result.findings.some((finding) => finding.kind === "chapter" && finding.title === "Kappa Kappa Gamma")).toBe(true);
    expect(result.findings.some((finding) => finding.title.includes("Kappa Delta Pi"))).toBe(false);
    const email = result.findings.find((finding) => finding.kind === "email" && finding.title === "grace.flesher@tcu.edu");
    expect(email?.detail).toBe("Primary contact · Zeta Tau Alpha · Grace Flesher");
    expect(result.findings.some((finding) => finding.kind === "members" && finding.quote?.includes("120"))).toBe(true);
    expect(result.findings.some((finding) => finding.kind === "dues" && finding.quote?.includes("$650"))).toBe(true);
    expect(result.findings.some((finding) => finding.quote?.includes("sporting events"))).toBe(false);
  });

  it("follows a campus directory to the fraternity office instead of guessing paths", async () => {
    const home = `<html><head><title>Mizzou</title></head><body><a href="/mizzou-a-z">A to Z</a><a href="/student-life">Student life</a><p>50+ Fraternities and sororities</p></body></html>`;
    const directory = `<html><head><title>A to Z</title></head><body><a href="/mizzou-a-z/f">F</a></body></html>`;
    const letter = `<html><head><title>F</title></head><body><a href="https://fsl.tcu.edu/">Fraternity and Sorority Life</a></body></html>`;
    const life = `<html><head><title>Student Life</title></head><body><p>Clubs and organizations</p></body></html>`;
    const fetchImpl = async (url: string) => {
      const body = url.includes("/mizzou-a-z/f") ? letter : url.includes("/mizzou-a-z") ? directory : url.includes("/student-life") ? life : url.includes("fsl.tcu.edu") ? html : home;
      const ok = url.startsWith("https://www.tcu.edu") || url.startsWith("https://fsl.tcu.edu");
      return new Response(ok ? body : "Missing", { status: ok ? 200 : 404, headers: { "content-type": "text/html" } });
    };
    const result = await readGreekLife(["tcu.edu"], fetchImpl as typeof fetch, 8_000);
    expect(result.pages.some((page) => page.url.includes("/greek-life"))).toBe(false);
    expect(result.pages.some((page) => page.ok && page.url.includes("fsl.tcu.edu"))).toBe(true);
    expect(result.findings.some((finding) => finding.kind === "chapter" && finding.title === "Sigma Chi")).toBe(true);
    expect(result.findings.some((finding) => finding.title === "president@tcu.edu")).toBe(true);
    expect(result.findings.some((finding) => finding.quote === "50+ Fraternities and sororities")).toBe(true);
  });
});
