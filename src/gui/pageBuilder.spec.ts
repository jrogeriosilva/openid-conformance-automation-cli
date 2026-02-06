import { buildPage } from "./pageBuilder";

const defaultEnv = { planId: "", token: "", serverUrl: "https://www.certification.openid.net" };
const defaultConfigs: string[] = [];

describe("pageBuilder", () => {
  it("should return valid HTML containing the dashboard title", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("OIDC Autopilot Dashboard");
    expect(html).toContain("OIDC Autopilot");
  });

  it("should include the launch form with required fields", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain('id="fConfigPath"');
    expect(html).toContain('id="fPlanId"');
    expect(html).toContain('id="fToken"');
    expect(html).toContain('id="fServerUrl"');
    expect(html).toContain("Launch Plan");
  });

  it("should include the collapsible log drawer", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain('id="logBox"');
    expect(html).toContain('id="logDrawer"');
    expect(html).toContain("Logs");
  });

  it("should include SSE connection code targeting /api/feed", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain("/api/feed");
    expect(html).toContain("EventSource");
  });

  it("should include the module cards grid for displaying test status", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain('id="cardsGrid"');
    expect(html).toContain("moduleList");
    expect(html).toContain("moduleUpdate");
  });

  it("should pre-fill form fields from env defaults", () => {
    const env = { planId: "my-plan-42", token: "secret-tok", serverUrl: "https://custom.example.com" };
    const html = buildPage(env, defaultConfigs);

    expect(html).toContain('value="my-plan-42"');
    expect(html).toContain('value="secret-tok"');
    expect(html).toContain('value="https://custom.example.com"');
  });

  it("should render config file options in the dropdown", () => {
    const files = ["plans/test.config.json", "other.config.json"];
    const html = buildPage(defaultEnv, files);

    expect(html).toContain("plans/test.config.json");
    expect(html).toContain("other.config.json");
    expect(html).toContain("<option");
  });

  it("should include a stop button", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    expect(html).toContain('id="btnStop"');
    expect(html).toContain("/api/stop");
  });

  it("should place cards section before config section in the HTML", () => {
    const html = buildPage(defaultEnv, defaultConfigs);

    const cardsPos = html.indexOf('id="cardsSection"');
    const configPos = html.indexOf('class="config-section"');
    expect(cardsPos).toBeLessThan(configPos);
  });
});
