import type { ModuleConfig, PlanConfig } from "../config/schema";
import type { Logger } from "./logger";
import type { ExecutionSummary, ModuleResult, RunnerOptions } from "./types";
import { ActionExecutor } from "./actions";
import { pollRunnerStatus } from "./runnerHelpers";

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

    const actionExecutor = new ActionExecutor(config.actions, {
      captureVars: config.capture_vars,
      headless: this.headless,
    });

    /*
      Execute each module in sequence
    */
    for (const moduleConfig of config.modules) {
      const result = await this.executeModule({
        planId,
        moduleConfig,
        actionExecutor,
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
    actionExecutor,
    captureVars,
  }: {
    planId: string;
    moduleConfig: ModuleConfig;
    actionExecutor: ActionExecutor;
    captureVars: string[];
  }): Promise<ModuleResult> {
    const moduleName = moduleConfig.name;
    const captured: Record<string, string> = {};
    const executedActions = new Set<string>();
    let isExecutedNavigation = false;

    this.logger.log(`[${moduleName}]: Registering...`);
    const runnerId = await this.api.registerRunner(planId, moduleName, {
      captureVars,
      store: captured,
    });
    this.logger.log(`[${moduleName}]: Registering... OK (ID: ${runnerId})`);
    
    const terminalState = await pollRunnerStatus({
      context: {
        api: this.api,
        pollInterval: this.pollInterval,
        timeout: this.timeout,
        headless: this.headless,
        logger: this.logger,
      },
      runnerId,
      moduleName,
      captureVars,
      captured,
      actions: moduleConfig.actions ?? [],
      actionExecutor,
      executedActions,
      isNavigationExecuted: () => isExecutedNavigation,
      markNavigationExecuted: () => {
        isExecutedNavigation = true;
      },
    });

    return {
      name: moduleName,
      runnerId,
      state: terminalState.state,
      result: terminalState.info.result,
      captured,
    };
  }

}
