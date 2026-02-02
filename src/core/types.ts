import { ConformanceApi } from "./conformanceApi";
import { Logger } from "./logger";

export type TestState =
  | "CREATED"
  | "CONFIGURED"
  | "WAITING"
  | "RUNNING"
  | "FINISHED"
  | "INTERRUPTED";

export type TestResult =
  | "PASSED"
  | "FAILED"
  | "WARNING"
  | "SKIPPED"
  | "REVIEW"
  | "UNKNOWN";

export interface ModuleResult {
  name: string;
  runnerId: string;
  state: TestState;
  result: TestResult;
  errorMessage?: string;
  captured: Record<string, string>;
}

export interface ExecutionSummary {
  planId: string;
  total: number;
  passed: number;
  failed: number;
  warning: number;
  review: number;
  unknown: number;
  skipped: number;
  interrupted: number;
  modules: ModuleResult[];
}

export interface RunnerOptions {
  api: ConformanceApi;
  pollInterval: number;
  timeout: number;
  headless: boolean;
  logger: Logger;
}
