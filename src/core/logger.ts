import type { ExecutionSummary } from "./types";

export interface Logger {
  info(message: string): void;
  log(message: string): void;
  error(message: string): void;
  summary(summary: ExecutionSummary): void;
}

export const createLogger = (): Logger => ({
  info: (message) => console.log(`[INFO]: ${message}`),
  log: (message) => console.log(message),
  error: (message) => console.error(`[ERROR]: ${message}`),
  summary: (summary) => {
    console.log("");
    console.log("--- EXECUTION SUMMARY ---");
    console.log(`Total Modules: ${summary.total}`);
    console.log(`PASS: ${summary.passed}`);
    console.log(`FAIL: ${summary.failed}`);
    if (summary.warning > 0) {
      console.log(`WARNING: ${summary.warning}`);
    }
    if (summary.review > 0) {
      console.log(`REVIEW: ${summary.review}`);
    }
    if (summary.unknown > 0) {
      console.log(`UNKNOWN: ${summary.unknown}`);
    }
    console.log(`SKIPPED/INTERRUPTED: ${summary.skipped + summary.interrupted}`);
    console.log("-".repeat(40));
  },
});
