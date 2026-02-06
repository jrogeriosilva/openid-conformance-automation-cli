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

  it("should include the collapsible log drawer", () => {
    const html = buildPage();

    expect(html).toContain('id="logBox"');
    expect(html).toContain('id="logDrawer"');
    expect(html).toContain("Logs");
  });

  it("should include SSE connection code targeting /api/feed", () => {
    const html = buildPage();

    expect(html).toContain("/api/feed");
    expect(html).toContain("EventSource");
  });

  it("should include the module cards grid for displaying test status", () => {
    const html = buildPage();

    expect(html).toContain('id="cardsGrid"');
    expect(html).toContain("moduleList");
    expect(html).toContain("moduleUpdate");
  });
});
