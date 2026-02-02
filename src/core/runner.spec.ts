import type { PlanConfig } from "../config/schema";
import { loadIsolatedModule } from "../testUtils/isolateModule";

describe("Runner", () => {
  const setupRunner = () => {
    const mocks = {
      captureFromObject: jest.fn(),
      navigateWithPlaywright: jest.fn().mockResolvedValue("http://final"),
      sleep: jest.fn().mockResolvedValue(undefined),
      ActionExecutor: jest.fn(),
    };

    const Runner = loadIsolatedModule(
      () => {
        jest.doMock("./capture", () => ({ captureFromObject: mocks.captureFromObject }));
        jest.doMock("./playwrightRunner", () => ({
          navigateWithPlaywright: mocks.navigateWithPlaywright,
        }));
        jest.doMock("../utils/sleep", () => ({ sleep: mocks.sleep }));
        jest.doMock("./constants", () => ({
          CONSTANTS: { CALLBACK_VARIABLE_NAME: "callbackUrl" },
        }));
        jest.doMock("./actions", () => ({ ActionExecutor: mocks.ActionExecutor }));
      },
      () => require("./runner").Runner
    );

    return { Runner, mocks };
  };

  const createRunner = (Runner: any, api: unknown) => {
    const logger = { log: jest.fn() };
    const runner = new Runner({
      api,
      pollInterval: 0,
      timeout: 5,
      headless: true,
      logger,
    });
    return { runner, logger };
  };

  const createConfig = (overrides: Partial<PlanConfig> = {}): PlanConfig => ({
    capture_vars: [],
    actions: [],
    modules: [],
    ...overrides,
  });

  const actionConfig = {
    name: "act1",
    endpoint: "https://example.com/act1",
    method: "GET",
  };

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

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      modules: [{ name: "module-1" }, { name: "module-2" }],
    });

    const summary = await runner.executePlan({ planId: "p1", config });

    expect(summary.total).toBe(2);
    expect(summary.passed).toBe(1);
    expect(summary.failed).toBe(1);
    expect(summary.interrupted).toBe(1);
    expect(summary.modules[0].runnerId).toBe("r1");
    expect(summary.modules[1].runnerId).toBe("r2");
  });

  test("executePlan aggregates review and unknown results", async () => {
    const { Runner, mocks } = setupRunner();

    mocks.ActionExecutor.mockImplementation(() => ({ executeAction: jest.fn() }));

    const api = {
      registerRunner: jest
        .fn()
        .mockResolvedValueOnce("r1")
        .mockResolvedValueOnce("r2"),
      getModuleInfo: jest.fn(async (runnerId: string) => {
        if (runnerId === "r1") {
          return { status: "FINISHED", result: "REVIEW" };
        }
        return { status: "FINISHED", result: "UNKNOWN" };
      }),
      getRunnerInfo: jest.fn(),
      getModuleLogs: jest.fn(),
    };

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      modules: [{ name: "module-1" }, { name: "module-2" }],
    });

    const summary = await runner.executePlan({ planId: "p1", config });

    expect(summary.review).toBe(1);
    expect(summary.unknown).toBe(1);
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
        .mockResolvedValueOnce({ status: "WAITING", result: "UNKNOWN" })
        .mockResolvedValueOnce({ status: "FINISHED", result: "PASSED" }),
      getRunnerInfo: jest.fn().mockResolvedValue({
        browser: { urls: ["http://start"], urlsWithMethod: [] },
      }),
      getModuleLogs: jest.fn().mockResolvedValue({ entries: [] }),
    };

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      actions: [actionConfig],
      modules: [{ name: "module-1", actions: ["act1"] }],
    });

    await runner.executePlan({ planId: "p1", config });

    expect(api.getRunnerInfo).toHaveBeenCalledTimes(1);
    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(executeAction).toHaveBeenCalledWith("act1", expect.any(Object));
    expect(mocks.navigateWithPlaywright).toHaveBeenCalledTimes(2);
    expect(mocks.navigateWithPlaywright).toHaveBeenNthCalledWith(1, "http://start", true);
    expect(mocks.navigateWithPlaywright).toHaveBeenNthCalledWith(2, "http://callback", true);
    expect(mocks.sleep).toHaveBeenCalledTimes(1);
  });

  test("executes actions once and captures vars during WAITING", async () => {
    const { Runner, mocks } = setupRunner();

    mocks.captureFromObject.mockImplementation(
      (source: unknown, vars: string[], store: Record<string, string>) => {
        if (!source || typeof source !== "object") {
          return;
        }
        for (const key of vars) {
          const value = (source as Record<string, unknown>)[key];
          if (typeof value === "string") {
            store[key] = value;
          }
        }
      }
    );

    const executeAction = jest.fn().mockResolvedValue({ actionValue: "yes" });
    mocks.ActionExecutor.mockImplementation(() => ({ executeAction }));

    const api = {
      registerRunner: jest.fn().mockResolvedValue("r1"),
      getModuleInfo: jest
        .fn()
        .mockResolvedValueOnce({ status: "WAITING", result: "UNKNOWN" })
        .mockResolvedValueOnce({ status: "FINISHED", result: "PASSED" }),
      getRunnerInfo: jest.fn().mockResolvedValue({
        browser: { urls: ["http://start"], urlsWithMethod: [] },
      }),
      getModuleLogs: jest.fn().mockResolvedValue({ fromLog: "log-value" }),
    };

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      capture_vars: ["fromLog"],
      actions: [actionConfig],
      modules: [{ name: "module-1", actions: ["act1"] }],
    });

    const summary = await runner.executePlan({ planId: "p1", config });

    expect(executeAction).toHaveBeenCalledTimes(1);
    expect(api.getModuleLogs).toHaveBeenCalledTimes(1);
    expect(summary.modules[0].captured.fromLog).toBe("log-value");
    expect(summary.modules[0].captured.actionValue).toBe("yes");
  });

  test("stops polling when interrupted and skips actions", async () => {
    const { Runner, mocks } = setupRunner();

    const executeAction = jest.fn();
    mocks.ActionExecutor.mockImplementation(() => ({ executeAction }));

    const api = {
      registerRunner: jest.fn().mockResolvedValue("r1"),
      getModuleInfo: jest
        .fn()
        .mockResolvedValueOnce({ status: "INTERRUPTED", result: "FAILED" }),
      getRunnerInfo: jest.fn(),
      getModuleLogs: jest.fn(),
    };

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      actions: [actionConfig],
      modules: [{ name: "module-1", actions: ["act1"] }],
    });

    const summary = await runner.executePlan({ planId: "p1", config });

    expect(summary.modules[0].state).toBe("INTERRUPTED");
    expect(api.getRunnerInfo).not.toHaveBeenCalled();
    expect(api.getModuleLogs).not.toHaveBeenCalled();
    expect(executeAction).not.toHaveBeenCalled();
    expect(mocks.sleep).not.toHaveBeenCalled();
  });

  test("does not execute actions when no browser URL is available", async () => {
    const { Runner, mocks } = setupRunner();

    const executeAction = jest.fn().mockResolvedValue({});
    mocks.ActionExecutor.mockImplementation(() => ({ executeAction }));

    const api = {
      registerRunner: jest.fn().mockResolvedValue("r1"),
      getModuleInfo: jest
        .fn()
        .mockResolvedValueOnce({ status: "WAITING", result: "UNKNOWN" })
        .mockResolvedValueOnce({ status: "FINISHED", result: "PASSED" }),
      getRunnerInfo: jest.fn().mockResolvedValue({
        browser: { urls: [], urlsWithMethod: [] },
      }),
      getModuleLogs: jest.fn().mockResolvedValue({ entries: [] }),
    };

    const { runner } = createRunner(Runner, api);

    const config = createConfig({
      actions: [actionConfig],
      modules: [{ name: "module-1", actions: ["act1"] }],
    });

    await runner.executePlan({ planId: "p1", config });

    expect(mocks.navigateWithPlaywright).not.toHaveBeenCalled();
    expect(executeAction).not.toHaveBeenCalled();
  });
});
