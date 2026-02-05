import { createLogger } from "./logger";
import type { ExecutionSummary } from "./types";

describe("createLogger with hooks", () => {
  let consoleSpy: jest.SpyInstance;
  let consoleErrSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleSpy = jest.spyOn(console, "log").mockImplementation();
    consoleErrSpy = jest.spyOn(console, "error").mockImplementation();
  });

  afterEach(() => {
    consoleSpy.mockRestore();
    consoleErrSpy.mockRestore();
  });

  it("should call onLine hook for info calls", () => {
    const onLine = jest.fn();
    const logger = createLogger({ onLine });

    logger.info("test-msg", { moduleName: "mod1" });

    expect(onLine).toHaveBeenCalledWith("info", "test-msg", { moduleName: "mod1" });
  });

  it("should call onLine hook for log calls", () => {
    const onLine = jest.fn();
    const logger = createLogger({ onLine });

    logger.log("hello");

    expect(onLine).toHaveBeenCalledWith("log", "hello", undefined);
  });

  it("should call onLine hook for error calls", () => {
    const onLine = jest.fn();
    const logger = createLogger({ onLine });

    logger.error("boom", { actionName: "act1" });

    expect(onLine).toHaveBeenCalledWith("error", "boom", { actionName: "act1" });
  });

  it("should call onLine hook for debug calls", () => {
    const onLine = jest.fn();
    const logger = createLogger({ onLine });

    logger.debug("dbg-msg");

    expect(onLine).toHaveBeenCalledWith("debug", "dbg-msg", undefined);
  });

  it("should call onSummary hook when summary is invoked", () => {
    const onSummary = jest.fn();
    const logger = createLogger({ onSummary });

    const fakeSummary: ExecutionSummary = {
      planId: "p1",
      total: 3,
      passed: 2,
      failed: 1,
      warning: 0,
      skipped: 0,
      interrupted: 0,
      modules: [],
    };

    logger.summary(fakeSummary);

    expect(onSummary).toHaveBeenCalledWith(fakeSummary);
  });

  it("should still work when no hooks are provided", () => {
    const logger = createLogger();

    expect(() => logger.info("no hooks")).not.toThrow();
    expect(() => logger.log("no hooks")).not.toThrow();
    expect(() => logger.error("no hooks")).not.toThrow();
    expect(() => logger.debug("no hooks")).not.toThrow();
  });

  it("should still print to console when hooks are present", () => {
    const onLine = jest.fn();
    const logger = createLogger({ onLine });

    logger.info("visible");

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("visible"));
  });
});
