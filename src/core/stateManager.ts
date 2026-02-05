import type { ConformanceApi, RunnerInfo } from "./conformanceApi";
import type { Logger, LogContext } from "./logger";
import type { TestState, TestResult } from "./types";
import { StateTimeoutError } from "./errors";
import { captureFromObject } from "./capture";
import { sleep } from "../utils/sleep";

/**
 * Handlers for state transitions.
 * These callbacks are invoked by the StateManager during polling.
 */
export interface StateHandlers {
  /**
   * Called once when module enters WAITING state.
   * Used for browser navigation.
   * Should return true if navigation actually occurred, false otherwise.
   */
  onNavigate?: (runnerInfo: RunnerInfo) => Promise<boolean>;

  /**
   * Called to execute actions after navigation.
   * The executedActions set tracks which actions have already been executed.
   */
  onExecuteActions?: (executedActions: Set<string>) => Promise<void>;
}

/**
 * Terminal state information returned when polling completes.
 */
export interface TerminalState {
  state: "FINISHED" | "INTERRUPTED";
  info: {
    status: TestState;
    result: TestResult;
  };
}

/**
 * StateManager encapsulates the state polling logic for test modules.
 *
 * This class is responsible for:
 * - Polling module status until terminal state (FINISHED/INTERRUPTED)
 * - Handling WAITING state by triggering navigation and actions
 * - Enforcing timeout constraints
 * - Capturing variables from API responses
 */
export class StateManager {
  constructor(
    private readonly api: ConformanceApi,
    private readonly pollIntervalSeconds: number,
    private readonly timeoutSeconds: number,
    private readonly logger: Logger
  ) {}

  /**
   * Polls the module status until it reaches a terminal state.
   *
   * @param runnerId - The ID of the runner to poll
   * @param captureVars - Variables to capture from API responses
   * @param captured - Store for captured variables
   * @param handlers - Callbacks for state transitions
   * @param logContext - Optional context for structured logging
   * @returns Terminal state information
   * @throws {StateTimeoutError} If polling exceeds timeout
   */
  async pollUntilTerminal(
    runnerId: string,
    captureVars: string[],
    captured: Record<string, string>,
    handlers: StateHandlers,
    logContext?: LogContext
  ): Promise<TerminalState> {
    const startTime = Date.now();
    const timeoutMs = this.timeoutSeconds * 1000;
    let navigationExecuted = false;
    const executedActions = new Set<string>();
    let lastState: TestState = "CREATED";

    while (true) {
      // Check timeout
      const elapsed = Date.now() - startTime;
      if (elapsed > timeoutMs) {
        throw new StateTimeoutError(runnerId, lastState, timeoutMs);
      }

      // Poll state
      const info = await this.api.getModuleInfo(runnerId, {
        captureVars,
        store: captured,
      });
      captureFromObject(info, captureVars, captured);
      const state = info.status;
      lastState = state;

      this.logger.log(`Polling... Current state: ${state}`, logContext);

      // Handle WAITING state
      if (state === "WAITING") {
        const wasNavigated = await this.handleWaitingState(
          runnerId,
          captureVars,
          captured,
          handlers,
          navigationExecuted,
          executedActions,
          logContext
        );
        if (wasNavigated) {
          navigationExecuted = true;
        }
      }

      // Terminal states
      if (state === "FINISHED" || state === "INTERRUPTED") {
        return {
          state,
          info: {
            status: info.status,
            result: info.result,
          }
        };
      }

      await sleep(this.pollIntervalSeconds * 1000);
    }
  }

  private async handleWaitingState(
    runnerId: string,
    captureVars: string[],
    captured: Record<string, string>,
    handlers: StateHandlers,
    navigationExecuted: boolean,
    executedActions: Set<string>,
    logContext?: LogContext
  ): Promise<boolean> {
    let didNavigate = false;

    // Navigate browser (once)
    if (!navigationExecuted && handlers.onNavigate) {
      this.logger.debug('Fetching runner information...', logContext);
      const runnerInfo = await this.api.getRunnerInfo(runnerId, {
        captureVars,
        store: captured,
      });
      captureFromObject(runnerInfo, captureVars, captured);

      this.logger.debug('Running navigation...', logContext);
      didNavigate = await handlers.onNavigate(runnerInfo);
    }

    // Execute actions after navigation completes in the same cycle
    // This matches the original behavior where actions execute in the same WAITING state
    // after navigation is done
    const shouldExecuteActions = navigationExecuted || didNavigate;
    if (handlers.onExecuteActions && shouldExecuteActions) {
      await handlers.onExecuteActions(executedActions);
    }

    return didNavigate;
  }
}
