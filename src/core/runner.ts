import type { PlanConfig } from "../config/schema";
import type { Logger } from "./logger";
import type { ExecutionSummary, ModuleResult, TestResult, TestState } from "./types";
import { ConformanceApi } from "./conformanceApi";
import { captureFromObject } from "./capture";
import { ActionExecutor } from "./actions";
import { navigateWithPlaywright } from "./playwrightRunner";
import { sleep } from "../utils/sleep";

export interface RunnerOptions {
  api: ConformanceApi;
  pollInterval: number;
  timeout: number;
  headless: boolean;
  logger: Logger;
}

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
    let executedWaitingNavigation = false;

    this.logger.log(`[${moduleName}]: Registrando...`);
    const moduleId = await this.api.registerModule(planId, moduleName);
    this.logger.log(`[${moduleName}]: Registrando... OK (ID: ${moduleId})`);

    const configuredOrTerminal = new Set<TestState>([
      "CONFIGURED",
      "WAITING",
      "FINISHED",
      "INTERRUPTED",
    ]);

    const initial = await this.pollUntilState(moduleId, configuredOrTerminal, captured, captureVars);

    if (initial.state === "CONFIGURED") {
      this.logger.log(`[${moduleName}]: Iniciando execucao...`);
      await this.api.startModule(moduleId);
    }

    const terminalState = await this.pollUntilTerminalWithActions({
      moduleId,
      moduleName,
      captureVars,
      captured,
      actions: moduleConfig.actions ?? [],
      actionExecutor,
      executedActions,
      executedWaitingNavigation: () => executedWaitingNavigation,
      markWaitingNavigationExecuted: () => {
        executedWaitingNavigation = true;
      },
    });

    const result: TestResult = this.toResult(terminalState.info.result ?? undefined);

    return {
      name: moduleName,
      moduleId,
      state: terminalState.state,
      result,
      captured,
    };
  }

  private async pollUntilState(
    moduleId: string,
    target: Set<TestState>,
    captured: Record<string, string>,
    captureVars: string[]
  ): Promise<{ state: TestState; info: { status?: string; result?: string | null } } > {
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < this.timeout * 1000) {
      attempt += 1;
      const info = await this.api.getModuleInfo(moduleId);
      captureFromObject(info, captureVars, captured);
      const state = ConformanceApi.toState(info.status);

      if (target.has(state)) {
        return { state, info };
      }

      this.logger.log(`[${moduleId}]: Polling... Estado: ${state}`);
      await sleep(this.pollInterval * 1000);
    }

    throw new Error(`Timeout waiting for module ${moduleId}`);
  }

  private async pollUntilTerminalWithActions({
    moduleId,
    moduleName,
    captureVars,
    captured,
    actions,
    actionExecutor,
    executedActions,
    executedWaitingNavigation,
    markWaitingNavigationExecuted,
  }: {
    moduleId: string;
    moduleName: string;
    captureVars: string[];
    captured: Record<string, string>;
    actions: string[];
    actionExecutor: ActionExecutor;
    executedActions: Set<string>;
    executedWaitingNavigation: () => boolean;
    markWaitingNavigationExecuted: () => void;
  }): Promise<{ state: TestState; info: { status?: string; result?: string | null } } > {
    const start = Date.now();
    let attempt = 0;

    while (Date.now() - start < this.timeout * 1000) {
      attempt += 1;
      const info = await this.api.getModuleInfo(moduleId);
      captureFromObject(info, captureVars, captured);
      const state = ConformanceApi.toState(info.status);

      this.logger.log(`[${moduleName}]: Polling... Estado: ${state}`);

      if (state === "WAITING" && actions.length > 0) {
        await this.tryExecuteActions({
          moduleId,
          moduleName,
          actions,
          actionExecutor,
          executedActions,
          captured,
          captureVars,
        });
      }

      if (state === "WAITING" && !executedWaitingNavigation()) {
        this.logger.log(`[${moduleName}]: Executando navegacao aguardando...`);
        const navigated = await this.tryExecuteWaitingNavigation({
          moduleId,
          moduleName,
          captured,
          captureVars,
        });
        if (navigated) {
          markWaitingNavigationExecuted();
        }
      }

      if (state === "FINISHED" || state === "INTERRUPTED") {
        return { state, info };
      }

      await sleep(this.pollInterval * 1000);
    }

    throw new Error(`Timeout waiting for module ${moduleId}`);
  }

  private async tryExecuteActions({
    moduleId,
    moduleName,
    actions,
    actionExecutor,
    executedActions,
    captured,
    captureVars,
  }: {
    moduleId: string;
    moduleName: string;
    actions: string[];
    actionExecutor: ActionExecutor;
    executedActions: Set<string>;
    captured: Record<string, string>;
    captureVars: string[];
  }): Promise<void> {
    const logs = await this.api.getModuleLogs(moduleId);
    captureFromObject(logs, captureVars, captured);
    this.logger.log(`[${moduleName}]: Logs obtidos para execucao de acoes.`);

    for (const actionName of actions) {
      if (executedActions.has(actionName)) {
        continue;
      }

      this.logger.log(`[${moduleName}]: Executando action '${actionName}'...`);
      const newlyCaptured = await actionExecutor.executeAction(actionName, captured);
      Object.assign(captured, newlyCaptured);
      executedActions.add(actionName);
      this.logger.log(`[${moduleName}]: Action '${actionName}' concluida.`);
    }
  }

  private async tryExecuteWaitingNavigation({
    moduleId,
    moduleName,
    captured,
    captureVars,
  }: {
    moduleId: string;
    moduleName: string;
    captured: Record<string, string>;
    captureVars: string[];
  }): Promise<boolean> {
    this.logger.log(`[${moduleName}]: Obtendo info do runner para navegacao...`);
    const runnerInfo = await this.api.getRunnerInfo(moduleId);
    captureFromObject(runnerInfo, captureVars, captured);

    const browser = runnerInfo.browser;
    const directUrl = browser?.urls?.[0];
    const methodUrl = browser?.urlsWithMethod?.find((entry) => {
      return !entry.method || entry.method.toUpperCase() === "GET";
    })?.url;
    const targetUrl = directUrl ?? methodUrl;

    if (!targetUrl) {
      const urls = browser?.urls?.length ? browser.urls.join(", ") : "(vazio)";
      const urlsWithMethod = browser?.urlsWithMethod?.length
        ? browser.urlsWithMethod
            .map((entry) => `${entry.method ?? "GET"} ${entry.url}`)
            .join(", ")
        : "(vazio)";
      this.logger.log(
        `[${moduleName}]: Nenhuma URL de navegador encontrada. urls=${urls} urlsWithMethod=${urlsWithMethod}`
      );
      return false;
    }

    this.logger.log(`[${moduleName}]: Navegando para URL de browser: ${targetUrl}`);
    const finalUrl = await navigateWithPlaywright(targetUrl, this.headless);
    this.logger.log(`[${moduleName}]: Navegacao concluida para URL de browser: ${finalUrl}`);
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
