import { buildConfigManagerPage } from "./configManagerPageBuilder";

describe("configManagerPageBuilder", () => {
  const html = buildConfigManagerPage();

  it("should return valid HTML with the Config Manager title", () => {
    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain("Config Manager");
    expect(html).toContain("OIDC Autopilot");
  });

  it("should include a nav link back to the Dashboard", () => {
    expect(html).toContain('href="/"');
    expect(html).toContain("Dashboard");
  });

  it("should include toolbar buttons", () => {
    expect(html).toContain('id="btnNew"');
    expect(html).toContain('id="btnLoad"');
    expect(html).toContain('id="btnSave"');
    expect(html).toContain('id="btnDelete"');
  });

  it("should include the config file dropdown and filename input", () => {
    expect(html).toContain('id="selConfig"');
    expect(html).toContain('id="inpFilename"');
  });

  it("should include the global variables section", () => {
    expect(html).toContain('id="varRows"');
    expect(html).toContain('id="btnAddVar"');
    expect(html).toContain("Global Variables");
  });

  it("should include the capture variables section", () => {
    expect(html).toContain('id="captureRows"');
    expect(html).toContain('id="btnAddCapture"');
    expect(html).toContain("Capture Variables");
  });

  it("should include the actions section with editor area", () => {
    expect(html).toContain('id="actionCards"');
    expect(html).toContain('id="btnAddAction"');
    expect(html).toContain('id="actionEditor"');
    expect(html).toContain("Actions");
  });

  it("should include a text input for plan name instead of a dropdown", () => {
    expect(html).toContain('id="inpPlanName"');
    expect(html).not.toContain('id="selPlan"');
    expect(html).toContain('id="btnFetchModules"');
    expect(html).toContain('id="inpModuleFilter"');
  });

  it("should include the Available Modules section", () => {
    expect(html).toContain("Available Modules");
    expect(html).toContain('id="moduleList"');
  });

  it("should include select/deselect all buttons for modules", () => {
    expect(html).toContain('id="btnSelectAll"');
    expect(html).toContain('id="btnDeselectAll"');
  });

  it("should include the Selected Modules section with ordered list", () => {
    expect(html).toContain("Selected Modules");
    expect(html).toContain('id="selectedModulesList"');
  });

  it("should include drag handles for reordering", () => {
    expect(html).toContain("drag-handle");
    expect(html).toContain("dragging");
    expect(html).toContain("drag-over-above");
    expect(html).toContain("drag-over-below");
  });

  it("should include the module config detail section", () => {
    expect(html).toContain('id="moduleDetailSection"');
    expect(html).toContain('id="moduleDetailBody"');
    expect(html).toContain("Module Config");
  });

  it("should reference only valid API endpoints (no /api/plan-names)", () => {
    expect(html).toContain("/api/configs");
    expect(html).toContain("/api/plan/info/");
    expect(html).toContain("/api/config/");
    expect(html).not.toContain("/api/plan-names");
  });

  it("should include the status bar", () => {
    expect(html).toContain('id="statusBar"');
    expect(html).toContain("Ready");
  });

  it("should include the unsaved/dirty badge", () => {
    expect(html).toContain('id="dirtyBadge"');
    expect(html).toContain("unsaved");
  });

  it("should place left panel before right panel in the HTML", () => {
    const leftPos = html.indexOf('class="cm-panel cm-left"');
    const rightPos = html.indexOf('class="cm-panel cm-right"');
    expect(leftPos).toBeGreaterThan(-1);
    expect(rightPos).toBeGreaterThan(-1);
    expect(leftPos).toBeLessThan(rightPos);
  });

  it("should include CSS for selected modules list", () => {
    expect(html).toContain("selected-modules-list");
    expect(html).toContain("selected-module-item");
  });

  it("should include drag-to-reorder and standardized delete in JS", () => {
    expect(html).toContain("dragstart");
    expect(html).toContain("clearDragIndicators");
    expect(html).toContain("btn-delete");
    expect(html).not.toContain("btn-remove");
  });
});
