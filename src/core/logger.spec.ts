import { createLogger } from "./logger";
import type { ExecutionSummary } from "./types";

describe("createLogger", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;
  let debugSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, "log").mockImplementation(() => undefined);
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => undefined);
    debugSpy = jest.spyOn(console, "debug").mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    debugSpy.mockRestore();
    delete process.env.DEBUG;
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
    expect(logSpy).toHaveBeenNthCalledWith(7, "SKIPPED/INTERRUPTED: 2");
    expect(logSpy).toHaveBeenNthCalledWith(8, "----------------------------------------");
    expect(logSpy).toHaveBeenCalledTimes(8);
  });

  describe("contextual logging", () => {
    it("logs with module name only", () => {
      const logger = createLogger();
      logger.log("Test message", {
        moduleName: "test-module",
      });

      expect(logSpy).toHaveBeenCalledWith("[test-module] Test message");
    });

    it("logs with module and action name", () => {
      const logger = createLogger();
      logger.log("Test message", {
        moduleName: "test-module",
        actionName: "login",
      });

      expect(logSpy).toHaveBeenCalledWith(
        "[test-module:login] Test message"
      );
    });

    it("does not show correlation ID or state in regular logs", () => {
      const logger = createLogger();
      logger.log("Test message", {
        correlationId: "test-123",
        moduleName: "test-module",
        state: "WAITING",
      });

      // State and correlation ID should not appear in regular logs
      expect(logSpy).toHaveBeenCalledWith("[test-module] Test message");
    });

    it("logs info with context", () => {
      const logger = createLogger();
      logger.info("Test message", {
        moduleName: "test-module",
      });

      expect(logSpy).toHaveBeenCalledWith(
        "[INFO]: [test-module] Test message"
      );
    });

    it("logs error with context", () => {
      const logger = createLogger();
      logger.error("Test error", {
        moduleName: "test-module",
      });

      expect(errorSpy).toHaveBeenCalledWith(
        "[ERROR]: [test-module] Test error"
      );
    });
  });

  describe("debug logging", () => {
    it("does not log debug without DEBUG env var", () => {
      const logger = createLogger();
      logger.debug("Test debug message");

      expect(debugSpy).not.toHaveBeenCalled();
    });

    it("logs debug with DEBUG env var", () => {
      process.env.DEBUG = "true";
      const logger = createLogger();
      logger.debug("Test debug message");

      expect(debugSpy).toHaveBeenCalledWith("[DEBUG]: Test debug message");
    });

    it("logs debug with full context when DEBUG env var is set", () => {
      process.env.DEBUG = "true";
      const logger = createLogger();
      logger.debug("Test debug message", {
        correlationId: "test-module-1234567890",
        moduleName: "test-module",
        state: "WAITING",
      });

      // Debug mode shows more details including short correlation ID
      expect(debugSpy).toHaveBeenCalledWith(
        "[DEBUG]: [1234567890:test-module:WAITING] Test debug message"
      );
    });

    it("logs debug with action in context", () => {
      process.env.DEBUG = "true";
      const logger = createLogger();
      logger.debug("Test debug message", {
        correlationId: "test-module-9999",
        moduleName: "test-module",
        state: "WAITING",
        actionName: "login",
      });

      expect(debugSpy).toHaveBeenCalledWith(
        "[DEBUG]: [9999:test-module:WAITING:login] Test debug message"
      );
    });
  });
});
