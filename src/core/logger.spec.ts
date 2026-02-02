import { createLogger } from "./logger";
import type { ExecutionSummary } from "./types";

describe("createLogger", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  it("logs info with INFO prefix", () => {
    const logger = createLogger();

    logger.info("hello");

    expect(logSpy).toHaveBeenCalledWith("[INFO]: hello");
  });

  it("logs raw messages with log", () => {
    const logger = createLogger();

    logger.log("plain");

    expect(logSpy).toHaveBeenCalledWith("plain");
  });

  it("logs error with ERROR prefix", () => {
    const logger = createLogger();

    logger.error("boom");

    expect(errorSpy).toHaveBeenCalledWith("[ERROR]: boom");
  });

  it("prints summary without warning line when warning is zero", () => {
    const logger = createLogger();

    const summary: ExecutionSummary = {
      planId: "plan-1",
      total: 3,
      passed: 2,
      failed: 1,
      warning: 0,
      review: 0,
      unknown: 0,
      skipped: 0,
      interrupted: 0,
      modules: [],
    };

    logger.summary(summary);

    expect(logSpy).toHaveBeenNthCalledWith(1, "");
    expect(logSpy).toHaveBeenNthCalledWith(2, "--- EXECUTION SUMMARY ---");
    expect(logSpy).toHaveBeenNthCalledWith(3, "Total Modules: 3");
    expect(logSpy).toHaveBeenNthCalledWith(4, "PASS: 2");
    expect(logSpy).toHaveBeenNthCalledWith(5, "FAIL: 1");
    expect(logSpy).toHaveBeenNthCalledWith(6, "SKIPPED/INTERRUPTED: 0");
    expect(logSpy).toHaveBeenNthCalledWith(7, "----------------------------------------");
    expect(logSpy).toHaveBeenCalledTimes(7);
  });

  it("prints summary with warning line when warning is positive", () => {
    const logger = createLogger();

    const summary: ExecutionSummary = {
      planId: "plan-2",
      total: 4,
      passed: 3,
      failed: 1,
      warning: 2,
      review: 1,
      unknown: 1,
      skipped: 1,
      interrupted: 1,
      modules: [],
    };

    logger.summary(summary);

    expect(logSpy).toHaveBeenNthCalledWith(1, "");
    expect(logSpy).toHaveBeenNthCalledWith(2, "--- EXECUTION SUMMARY ---");
    expect(logSpy).toHaveBeenNthCalledWith(3, "Total Modules: 4");
    expect(logSpy).toHaveBeenNthCalledWith(4, "PASS: 3");
    expect(logSpy).toHaveBeenNthCalledWith(5, "FAIL: 1");
    expect(logSpy).toHaveBeenNthCalledWith(6, "WARNING: 2");
    expect(logSpy).toHaveBeenNthCalledWith(7, "REVIEW: 1");
    expect(logSpy).toHaveBeenNthCalledWith(8, "UNKNOWN: 1");
    expect(logSpy).toHaveBeenNthCalledWith(9, "SKIPPED/INTERRUPTED: 2");
    expect(logSpy).toHaveBeenNthCalledWith(10, "----------------------------------------");
    expect(logSpy).toHaveBeenCalledTimes(10);
  });
});
