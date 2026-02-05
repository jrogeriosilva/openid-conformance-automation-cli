import { OidcAutopilotDashboard } from "./server";

// Only test the class instantiation and structure – actual HTTP
// testing would require spinning up a port which is integration-level.
describe("OidcAutopilotDashboard", () => {
  it("should be constructable with a port number", () => {
    const dashboard = new OidcAutopilotDashboard(0);
    expect(dashboard).toBeDefined();
  });
});
