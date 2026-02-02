describe("Runner", () => {
  function setupRunner() {
    jest.resetModules();

    const mocks = {
      captureFromObject: jest.fn(),
      navigateWithPlaywright: jest.fn().mockResolvedValue("http://final"),
      sleep: jest.fn().mockResolvedValue(undefined),
      ActionExecutor: jest.fn(),
    };

    let Runner: any;

    jest.isolateModules(() => {
      jest.doMock("./capture", () => ({ captureFromObject: mocks.captureFromObject }));
      jest.doMock("./playwrightRunner", () => ({
        navigateWithPlaywright: mocks.navigateWithPlaywright,
      }));
      jest.doMock("../utils/sleep", () => ({ sleep: mocks.sleep }));
      jest.doMock("./constants", () => ({
        CONSTANTS: { CALLBACK_VARIABLE_NAME: "callbackUrl" },
      }));
      jest.doMock("./conformanceApi", () => ({
        ConformanceApi: { toState: (status: string) => status },
      }));
      jest.doMock("./actions", () => ({ ActionExecutor: mocks.ActionExecutor }));

      Runner = require("./runner").Runner;
    });

    return { Runner, mocks };
  }

  test("executePlan aggregates results and interrupted counts", async () => {
    const { Runner, mocks } = setupRunner();

    mocks.ActionExecutor.mockImplementation(() => ({ executeAction: jest.fn() }));

    const api = {
      registerRunner: jest
        .fn()
        .mockResolvedValueOnce("r1")
        .mockResolvedValueOnce("r2"),
      getModuleInfo: jest.fn(async (runnerId: string) => {
        if (runnerId === "r1") {
          return { status: "FINISHED", result: "PASSED" };
        }
        return { status: "INTERRUPTED", result: "FAILED" };
      }),
      getRunnerInfo: jest.fn(),
      getModuleLogs: jest.fn(),
    };

    const logger = { log: jest.fn() };
    const runner = new Runner({
      api,
      pollInterval: 0,
      timeout: 5,
      headless: true,
      logger,
    });

    const config = {
      capture_vars: [],
      actions: {},
      modules: [{ name: "module-1" }, { name: "module-2" }],
    };

    const summary = await runner.executePlan({ planId: "p1", config });

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.interrupted).toBe(1);
    expect(summary.modules[0].runnerId).toBe("r1");
    expect(summary.modules[1].runnerId).toBe("r2");
  });

  test("executes navigation, actions, and callback redirect once", async () => {
    const { Runner, mocks } = setupRunner();

    const executeAction = jest
      .fn()
      .mockResolvedValue({ callbackUrl: "http://callback" });
    mocks.ActionExecutor.mockImplementation(() => ({ executeAction }));
    mocks.navigateWithPlaywright
      .mockResolvedValueOnce("http://final1")
      .mockResolvedValueOnce("http://final2");

    const api = {
      registerRunner: jest.fn().mockResolvedValue("r1"),
      getModuleInfo: jest
        .fn()
        .mockResolvedValueOnce({ status: "WAITING", result: null })
        .mockResolvedValueOnce({ status: "FINISHED", result: "PASSED" }),
      getRunnerInfo: jest.fn().mockResolvedValue({
        browser: { urls: ["http://start"] },
      }),
      getModuleLogs: jest.fn().mockResolvedValue({ entries: [] }),
    };

    const logger = { log: jest.fn() };
    const runner = new Runner({
      api,
      pollInterval: 0,
      timeout: 5,
      headless: true,
      logger,
    });

    const config = {
      capture_vars: [],
      actions: { act1: {} },
      modules: [{ name: "module-1", actions: ["act1"] }],
    };

    await runner.executePlan({ planId: "p1", config });

    expect(api.getRunnerInfo).toHaveBeenCalledTimes(1);
    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(executeAction).toHaveBeenCalledWith("act1", expect.any(Object));
    expect(mocks.navigateWithPlaywright).toHaveBeenCalledTimes(2);
    expect(mocks.navigateWithPlaywright).toHaveBeenNthCalledWith(1, "http://start", true);
    expect(mocks.navigateWithPlaywright).toHaveBeenNthCalledWith(2, "http://callback", true);
    expect(mocks.sleep).toHaveBeenCalledTimes(1);
  });

  test("does not execute actions when no browser URL is available", async () => {
    const { Runner, mocks } = setupRunner();

    const executeAction = jest.fn().mockResolvedValue({});
    mocks.ActionExecutor.mockImplementation(() => ({ executeAction }));

    const api = {
      registerRunner: jest.fn().mockResolvedValue("r1"),
      getModuleInfo: jest
        .fn()
        .mockResolvedValueOnce({ status: "WAITING", result: null })
        .mockResolvedValueOnce({ status: "FINISHED", result: "PASSED" }),
      getRunnerInfo: jest.fn().mockResolvedValue({
        browser: { urls: [], urlsWithMethod: [] },
      }),
      getModuleLogs: jest.fn().mockResolvedValue({ entries: [] }),
    };

    const logger = { log: jest.fn() };
    const runner = new Runner({
      api,
      pollInterval: 0,
      timeout: 5,
      headless: true,
      logger,
    });

    const config = {
      capture_vars: [],
      actions: { act1: {} },
      modules: [{ name: "module-1", actions: ["act1"] }],
    };

    await runner.executePlan({ planId: "p1", config });

    expect(mocks.navigateWithPlaywright).not.toHaveBeenCalled();
    expect(executeAction).not.toHaveBeenCalled();
  });
});