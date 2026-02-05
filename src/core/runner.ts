import type { ModuleConfig, PlanConfig } from "../config/schema";
import type { Logger } from "./logger";
import type { ExecutionSummary, ModuleResult, RunnerOptions } from "./types";
import { ActionExecutor } from "./actions";
import { BrowserSession } from "./browserSession";
import { StateManager } from "./stateManager";
import { ModuleExecutionError, StateTimeoutError, ActionExecutionError } from "./errors";
import { captureFromObject } from "./capture";

export class Runner {
  private readonly api: RunnerOptions["api"];
  private readonly pollInterval: number;
  private readonly timeout: number;
  private readonly headless: boolean;
  private readonly logger: Logger;

  constructor(options: RunnerOptions) {
    this.api = options.api;
    this.pollInterval = options.pollInterval;
    this.timeout = options.timeout;
    this.headless = options.headless;
    this.logger = options.logger;
  }

  async executePlan({
    planId,
    config,
  }: {
    planId: string;
    config: PlanConfig;
  }): Promise<ExecutionSummary> {
    const summary: ExecutionSummary = {
      planId,
      total: 0,
      passed: 0,
      failed: 0,
      warning: 0,
      skipped: 0,
      interrupted: 0,
      modules: [],
    };

    /*
      Execute each module in sequence
    */
    for (const moduleConfig of config.modules) {
      const result = await this.executeModule({
        planId,
        moduleConfig,
        globalVariables: config.variables ?? {},
        allActions: config.actions,
        captureVars: config.capture_vars,
      });

      summary.modules.push(result);
      summary.total += 1;
      switch (result.result) {
        case "PASSED":
          summary.passed += 1;
          break;
        case "FAILED":
          summary.failed += 1;
          break;
        case "WARNING":
          summary.warning += 1;
          break;
        case "SKIPPED":
          summary.skipped += 1;
          break;
      }
      if (result.state === "INTERRUPTED") {
        summary.interrupted += 1;
      }
    }

    return summary;
  }

  /**
   * Executes a single test module within a conformance test plan.
   *
   * This method handles the complete lifecycle of a test module execution:
   * 1. Registers the module with the conformance API
   * 2. Polls the module status until it reaches a terminal state
   * 3. Handles browser navigation when the module enters WAITING state
   * 4. Executes configured HTTP actions when needed
   * 5. Captures variables from responses throughout execution
   *
   * @param params - Execution parameters
   * @param params.planId - The ID of the test plan this module belongs to
   * @param params.moduleConfig - Configuration for the module including name and actions
   * @param params.actionExecutor - Executor for handling HTTP actions defined in the config
   * @param params.captureVars - Array of variable names to capture from API responses
   *
   * @returns A promise that resolves to the module execution result, including:
   *   - name: Module identifier
   *   - runnerId: Unique ID assigned by the conformance API
   *   - state: Final test state (FINISHED, INTERRUPTED, etc.)
   *   - result: Test outcome (PASSED, FAILED, WARNING, SKIPPED, etc.)
   *   - captured: Map of all variables captured during execution
   *
   * @throws {Error} If module registration fails or polling times out
   *
   * @private
   * @async
   */
  private async executeModule({
    planId,
    moduleConfig,
    globalVariables,
    allActions,
    captureVars,
  }: {
    planId: string;
    moduleConfig: ModuleConfig;
    globalVariables: Record<string, string>;
    allActions: PlanConfig["actions"];
    captureVars: string[];
  }): Promise<ModuleResult> {
    const moduleName = moduleConfig.name;
    const moduleVariables = moduleConfig.variables ?? {};
    const captured: Record<string, string> = {};

    // Generate correlation ID for tracing
    const correlationId = `${moduleName}-${Date.now()}`;

    // Create browser session per module
    const browserSession = new BrowserSession(this.headless);

    try {
      // Create action executor with browser session
      const actionExecutor = new ActionExecutor(allActions, {
        captureVars,
        headless: this.headless,
        globalVariables,
        browserSession,
      });

      this.logger.log('Registering...', {
        correlationId,
        moduleName,
      });

      const runnerId = await this.api.registerRunner(planId, moduleName, {
        captureVars,
        store: captured,
      });

      this.logger.log(`Registering... OK (ID: ${runnerId})`, {
        correlationId,
        moduleName,
      });

      // Create state manager
      const stateManager = new StateManager(
        this.api,
        this.pollInterval,
        this.timeout,
        this.logger
      );

      // Poll until terminal state
      const terminalState = await stateManager.pollUntilTerminal(
        runnerId,
        captureVars,
        captured,
        {
          onNavigate: async (runnerInfo) => {
            const url = this.getBrowserUrl(runnerInfo, moduleName, correlationId);
            if (url) {
              this.logger.log(`Navigating to URL: ${url}`, {
                correlationId,
                moduleName,
              });
              captureFromObject(url, captureVars, captured);
              const finalUrl = await browserSession.navigate(url);
              captureFromObject(finalUrl, captureVars, captured);
              this.logger.log(`Navigation completed for URL: ${finalUrl}`, {
                correlationId,
                moduleName,
              });
              return true;
            }
            return false;
          },
          onExecuteActions: async (executedActions) => {
            // Get logs for action execution
            const logs = await this.api.getModuleLogs(runnerId, {
              captureVars,
              store: captured,
            });
            captureFromObject(logs, captureVars, captured);
            this.logger.debug('Logs retrieved for action execution.', {
              correlationId,
              moduleName,
            });

            // Execute each action once
            for (const actionName of moduleConfig.actions ?? []) {
              if (!executedActions.has(actionName)) {
                this.logger.log(`Executing action '${actionName}'...`, {
                  correlationId,
                  moduleName,
                  actionName,
                });

                const newlyCaptured = await actionExecutor.executeAction(
                  actionName,
                  captured,
                  moduleVariables,
                  { correlationId, moduleName, actionName }
                );

                Object.assign(captured, newlyCaptured);
                executedActions.add(actionName);

                this.logger.log(`Action '${actionName}' completed.`, {
                  correlationId,
                  moduleName,
                  actionName,
                });
              }
            }
          },
        },
        { correlationId, moduleName }
      );

      this.logger.log('Module execution completed', {
        correlationId,
        moduleName,
        state: terminalState.state,
      });

      return {
        name: moduleName,
        runnerId,
        state: terminalState.state,
        result: terminalState.info.result,
        captured,
      };
    } catch (err) {
      // Log specific error types with context
      if (err instanceof StateTimeoutError) {
        this.logger.error(`Timeout in state ${err.lastState}`, {
          correlationId,
          moduleName,
          state: err.lastState,
        });
      } else if (err instanceof ActionExecutionError) {
        this.logger.error(`Action ${err.actionName} failed: ${err.message}`, {
          correlationId,
          moduleName,
          actionName: err.actionName,
        });
      } else if (err instanceof Error) {
        this.logger.error(err.message, {
          correlationId,
          moduleName,
        });
      }

      // Wrap in ModuleExecutionError
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new ModuleExecutionError(
        moduleName,
        'UNKNOWN',
        `Module execution failed: ${errorMessage}`,
        err instanceof Error ? err : undefined
      );
    } finally {
      // Cleanup browser session
      await browserSession.close();
    }
  }

  /**
   * Extracts the browser URL from runnerInfo for navigation.
   * Prefers direct URL, falls back to first GET method URL.
   */
  private getBrowserUrl(
    runnerInfo: any,
    moduleName: string,
    correlationId: string
  ): string | null {
    const browser = runnerInfo.browser;
    const directUrl = browser.urls[0];
    const methodUrl = browser.urlsWithMethod.find((entry: any) => {
      return entry.method.toUpperCase() === "GET";
    })?.url;
    const targetUrl = directUrl ?? methodUrl;

    if (!targetUrl) {
      const urls = browser.urls.length ? browser.urls.join(", ") : "(empty)";
      const urlsWithMethod = browser.urlsWithMethod.length
        ? browser.urlsWithMethod
            .map((entry: any) => `${entry.method} ${entry.url}`)
            .join(", ")
        : "(empty)";
      this.logger.log(
        `No browser URL found. urls=${urls} urlsWithMethod=${urlsWithMethod}`,
        { correlationId, moduleName }
      );
      return null;
    }

    return targetUrl;
  }

}
