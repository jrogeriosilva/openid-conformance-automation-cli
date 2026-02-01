import type { PlanConfig } from "../config/schema";
import type { Logger } from "./logger";
import type { ExecutionSummary, ModuleResult, RunnerOptions, TestResult, TestState } from "./types";
import { ConformanceApi } from "./conformanceApi";
import { captureFromObject } from "./capture";
import { ActionExecutor } from "./actions";
import { navigateWithPlaywright } from "./playwrightRunner";
import { sleep } from "../utils/sleep";
import { CONSTANTS } from "./constants";

export class Runner {
  private readonly api: ConformanceApi;
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

  private async executeModule({
    planId,
    moduleConfig,
    actionExecutor,
    captureVars,
  }: {
    planId: string;
    moduleConfig: { name: string; actions?: string[] };
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
    
    const terminalState = await this.pollUntilTerminalState({
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

    const result: TestResult = this.toResult(terminalState.info.result ?? undefined);

    return {
      name: moduleName,
      runnerId,
      state: terminalState.state,
      result,
      captured,
    };
  }

  private async pollUntilTerminalState({
    runnerId,
    moduleName,
    captureVars,
    captured,
    actions,
    actionExecutor,
    executedActions,
    isNavigationExecuted: isNavigationExecuted,
    markNavigationExecuted: markNavigationExecuted,
  }: {
    runnerId: string;
    moduleName: string;
    captureVars: string[];
    captured: Record<string, string>;
    actions: string[];
    actionExecutor: ActionExecutor;
    executedActions: Set<string>;
    isNavigationExecuted: () => boolean;
    markNavigationExecuted: () => void;
  }): Promise<{ state: TestState; info: { status?: string; result?: string | null } } > {
    const start = Date.now();

    while (Date.now() - start < this.timeout * 1000) {
      const info = await this.api.getModuleInfo(runnerId, {
        captureVars,
        store: captured,
      });
      captureFromObject(info, captureVars, captured);
      const state = ConformanceApi.toState(info.status);

      this.logger.log(`[${moduleName}]: Polling... State: ${state}`);

      // Navigate if in WAITING state and navigation not yet executed
      if (state === "WAITING" && !isNavigationExecuted()) {
        this.logger.log(`[${moduleName}]: Fetching runner information...`);
        const runnerInfo = await this.api.getRunnerInfo(runnerId, {
          captureVars,
          store: captured,
        });

        this.logger.log(`[${moduleName}]: Running navigation...`);
        const navigated = await this.navigateToUrl({
          runnerInfo,
          moduleName,
          captured,
          captureVars,
        });
        if (navigated) {
          markNavigationExecuted();
        }
      }

      // Execute actions after navigation
      if (actions.length > 0 && state === "WAITING" && isNavigationExecuted()) {
        await this.tryExecuteActions({
          runnerId,
          moduleName,
          actions,
          actionExecutor,
          executedActions,
          captured,
          captureVars,
        });
      }

      // TODO: Playwright: Redirect the browser to callback url returned by the navigation step
      if (state === "WAITING" && captured[CONSTANTS.CALLBACK_VARIABLE_NAME]) {
        this.logger.log(`[${moduleName}]: Redirecting to callback URL: ${captured[CONSTANTS.CALLBACK_VARIABLE_NAME]}`);
        const finalUrl = await navigateWithPlaywright(
          captured[CONSTANTS.CALLBACK_VARIABLE_NAME],
          this.headless
        );
        captureFromObject(finalUrl, captureVars, captured);
      }

      if (state === "FINISHED" || state === "INTERRUPTED") {
        return { state, info };
      }

      await sleep(this.pollInterval * 1000);
    }

    throw new Error(`Timeout waiting for runner ${runnerId}`);
  }

  private async tryExecuteActions({
    runnerId,
    moduleName,
    actions,
    actionExecutor,
    executedActions,
    captured,
    captureVars,
  }: {
    runnerId: string;
    moduleName: string;
    actions: string[];
    actionExecutor: ActionExecutor;
    executedActions: Set<string>;
    captured: Record<string, string>;
    captureVars: string[];
  }): Promise<void> {
    const logs = await this.api.getModuleLogs(runnerId, {
      captureVars,
      store: captured,
    });
    captureFromObject(logs, captureVars, captured);
    this.logger.log(`[${moduleName}]: Logs retrieved for action execution.`);

    for (const actionName of actions) {
      if (executedActions.has(actionName)) {
        continue;
      }

      this.logger.log(`[${moduleName}]: Executing action '${actionName}'...`);
      const newlyCaptured = await actionExecutor.executeAction(actionName, captured);
      Object.assign(captured, newlyCaptured);
      executedActions.add(actionName);
      this.logger.log(`[${moduleName}]: Action '${actionName}' completed.`);
    }
  }

  private async navigateToUrl({
    runnerInfo,
    moduleName,
    captured,
    captureVars,
  }: {
    runnerInfo: any;
    moduleName: string;
    captured: Record<string, string>;
    captureVars: string[];
  }): Promise<boolean> {
    captureFromObject(runnerInfo, captureVars, captured);

    const browser = runnerInfo.browser;
    const directUrl = browser?.urls?.[0];
    const methodUrl = browser?.urlsWithMethod?.find((entry: any) => {
      return !entry.method || entry.method.toUpperCase() === "GET";
    })?.url;
    const targetUrl = directUrl ?? methodUrl;

    if (!targetUrl) {
      const urls = browser?.urls?.length ? browser.urls.join(", ") : "(empty)";
      const urlsWithMethod = browser?.urlsWithMethod?.length
        ? browser.urlsWithMethod
            .map((entry: any) => `${entry.method ?? "GET"} ${entry.url}`)
            .join(", ")
        : "(empty)";
      this.logger.log(
        `[${moduleName}]: No browser URL found. urls=${urls} urlsWithMethod=${urlsWithMethod}`
      );
      return false;
    }

    this.logger.log(`[${moduleName}]: Navigating to URL: ${targetUrl}`);
    captureFromObject(targetUrl, captureVars, captured);
    const finalUrl = await navigateWithPlaywright(targetUrl, this.headless);
    captureFromObject(finalUrl, captureVars, captured);
    this.logger.log(`[${moduleName}]: Navigation completed for URL: ${finalUrl}`);
    return true;
  }

  private toResult(result?: string | null): TestResult {
    if (!result) {
      return "UNKNOWN";
    }

    switch (result.toUpperCase()) {
      case "PASSED":
        return "PASSED";
      case "FAILED":
        return "FAILED";
      case "WARNING":
        return "WARNING";
      case "SKIPPED":
        return "SKIPPED";
      case "REVIEW":
        return "REVIEW";
      default:
        return "UNKNOWN";
    }
  }
}
