import { runCli } from "./cli";
import { loadConfig } from "./config/loadConfig";
import { ConformanceApi } from "./core/conformanceApi";
import { Runner } from "./core/runner";
import { createLogger } from "./core/logger";

jest.mock("./config/loadConfig");
jest.mock("./core/conformanceApi");
jest.mock("./core/runner");
jest.mock("./core/logger");
jest.mock("dotenv", () => ({
  config: jest.fn(),
}));

const mockedLoadConfig = jest.mocked(loadConfig);
const MockedConformanceApi = jest.mocked(ConformanceApi);
const MockedRunner = jest.mocked(Runner);
const mockedCreateLogger = jest.mocked(createLogger);

const setArgv = (args: string[]) => {
  process.argv = ["node", "cli.js", ...args];
};

describe("runCli", () => {
  let exitSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.resetAllMocks();
    jest.restoreAllMocks();
    exitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((() => {
        throw new Error("process.exit");
      }) as never);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);

    mockedCreateLogger.mockReturnValue({
      info: jest.fn(),
      summary: jest.fn(),
    } as never);

    mockedLoadConfig.mockReturnValue({
      modules: [{ name: "m1" }],
    } as never);

    MockedConformanceApi.mockImplementation((() => ({})) as never);
    MockedRunner.mockImplementation((() => ({
      executePlan: jest.fn().mockResolvedValue({
        passed: 1,
        failed: 0,
        interrupted: 0,
      }),
    })) as never);

    delete process.env.CONFORMANCE_PLAN_ID;
    delete process.env.CONFORMANCE_TOKEN;
    delete process.env.CONFORMANCE_SERVER;
  });

  it("exits with error if --config is missing", async () => {
    setArgv(["--plan-id", "p1", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: --config is required");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error if plan id is missing", async () => {
    setArgv(["--config", "./config.json", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: --plan-id or CONFORMANCE_PLAN_ID is required");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error if token is missing", async () => {
    setArgv(["--config", "./config.json", "--plan-id", "p1"]);
    process.env.CONFORMANCE_TOKEN = "";
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: --token or CONFORMANCE_TOKEN is required");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("uses env fallback for plan id and token", async () => {
    process.env.CONFORMANCE_PLAN_ID = "env-plan";
    process.env.CONFORMANCE_TOKEN = "env-token";

    setArgv(["--config", "./config.json"]);
    await runCli();

    expect(MockedConformanceApi).toHaveBeenCalledWith(
      expect.objectContaining({ token: "env-token" })
    );
    const runnerInstance = MockedRunner.mock.results[0]?.value as {
      executePlan: jest.Mock;
    };
    expect(runnerInstance.executePlan).toHaveBeenCalledWith(
      expect.objectContaining({ planId: "env-plan" })
    );
  });

  it("exits if config has no modules", async () => {
    mockedLoadConfig.mockReturnValue({ modules: [] } as never);

    setArgv(["--config", "./config.json", "--plan-id", "p1", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: No test modules found in configuration file.");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("runs plan with provided options", async () => {
    setArgv([
      "--config",
      "./config.json",
      "--plan-id",
      "p1",
      "--token",
      "t1",
      "--base-url",
      "https://example.com",
      "--poll-interval",
      "7",
      "--timeout",
      "120",
      "--no-headless",
    ]);

    await runCli();

    expect(MockedConformanceApi).toHaveBeenCalledWith({
      baseUrl: "https://example.com",
      token: "t1",
    });
    expect(MockedRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        pollInterval: 7,
        timeout: 120,
        headless: false,
      })
    );
    const runnerInstance = MockedRunner.mock.results[0]?.value as {
      executePlan: jest.Mock;
    };
    expect(runnerInstance.executePlan).toHaveBeenCalledWith({
      planId: "p1",
      config: expect.anything(),
    });
  });

  it("uses default polling and timeout values", async () => {
    setArgv(["--config", "./config.json", "--plan-id", "p1", "--token", "t1"]);

    await runCli();

    expect(MockedRunner).toHaveBeenCalledWith(
      expect.objectContaining({
        pollInterval: 5,
        timeout: 240,
      })
    );
  });

  it("exits when summary has failures", async () => {
    MockedRunner.mockImplementation((() => ({
      executePlan: jest.fn().mockResolvedValue({
        passed: 0,
        failed: 1,
        interrupted: 0,
      }),
    })) as never);

    setArgv(["--config", "./config.json", "--plan-id", "p1", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits when summary has interruptions", async () => {
    MockedRunner.mockImplementation((() => ({
      executePlan: jest.fn().mockResolvedValue({
        passed: 1,
        failed: 0,
        interrupted: 1,
      }),
    })) as never);

    setArgv(["--config", "./config.json", "--plan-id", "p1", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("logs error and exits on executePlan error", async () => {
    MockedRunner.mockImplementation((() => ({
      executePlan: jest.fn().mockRejectedValue(new Error("boom")),
    })) as never);

    setArgv(["--config", "./config.json", "--plan-id", "p1", "--token", "t1"]);
    await expect(runCli()).rejects.toThrow("process.exit");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: boom");
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
