import { buildPage } from "./pageBuilder";

describe("pageBuilder", () => {
  it("should return valid HTML containing the dashboard title", () => {
    const html = buildPage();

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("OIDC Autopilot Dashboard");
    expect(html).toContain("OIDC Autopilot");
  });

  it("should include the launch form with required fields", () => {
    const html = buildPage();

    expect(html).toContain('id="fConfigPath"');
    expect(html).toContain('id="fPlanId"');
    expect(html).toContain('id="fToken"');
    expect(html).toContain('id="fServerUrl"');
    expect(html).toContain("Launch Plan");
  });

  it("should include the log viewer area", () => {
    const html = buildPage();

    expect(html).toContain('id="logBox"');
    expect(html).toContain("Live Log");
  });

  it("should include SSE connection code targeting /api/feed", () => {
    const html = buildPage();

    expect(html).toContain("/api/feed");
    expect(html).toContain("EventSource");
  });

  it("should include the outcome panel for displaying results", () => {
    const html = buildPage();

    expect(html).toContain('id="outcomePanel"');
    expect(html).toContain("Results");
    expect(html).toContain('id="moduleTable"');
  });
});
