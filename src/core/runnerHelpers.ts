import type { RunnerInfo } from "./conformanceApi";
import type { Logger } from "./logger";
import type { RunnerOptions, TestResult, TestState } from "./types";
import { captureFromObject } from "./capture";
import { ActionExecutor } from "./actions";
import { BrowserSession } from "./browserSession";
import { sleep } from "../utils/sleep";

export interface RunnerContext {
  api: RunnerOptions["api"];
  pollInterval: number;
  timeout: number;
  headless: boolean;
  logger: Logger;
  browserSession: BrowserSession;
}

/**
 * @deprecated Use StateManager class instead. This function is kept for backward compatibility
 * and will be removed in Phase 2 of the refactoring plan.
 *
 * Please migrate to StateManager for better separation of concerns and maintainability.
 * See src/core/stateManager.ts for the new implementation.
 */
export const pollRunnerStatus = async ({
  context,
  runnerId,
  moduleName,
  captureVars,
  captured,
  actions,
  moduleVariables,
  actionExecutor,
  executedActions,
  isNavigationExecuted,
  markNavigationExecuted,
}: {
  context: RunnerContext;
  runnerId: string;
  moduleName: string;
  captureVars: string[];
  captured: Record<string, string>;
  actions: string[];
  moduleVariables: Record<string, string>;
  actionExecutor: ActionExecutor;
  executedActions: Set<string>;
  isNavigationExecuted: () => boolean;
  markNavigationExecuted: () => void;
}): Promise<{ state: TestState; info: { status: TestState; result: TestResult } }> => {
  const start = Date.now();

  while (Date.now() - start < context.timeout * 1000) {
    const info = await context.api.getModuleInfo(runnerId, {
      captureVars,
      store: captured,
    });
    captureFromObject(info, captureVars, captured);
    const state = info.status;

    context.logger.log(`[${moduleName}]: Polling... State: ${state}`);

    if (state === "WAITING") {
      await handleWaitingState({
        context,
        runnerId,
        moduleName,
        captureVars,
        captured,
        actions,
        moduleVariables,
        actionExecutor,
        executedActions,
        isNavigationExecuted,
        markNavigationExecuted,
      });
    }

    if (state === "FINISHED" || state === "INTERRUPTED") {
      return { state, info };
    }

    await sleep(context.pollInterval * 1000);
  }

  throw new Error(`Timeout waiting for runner ${runnerId}`);
};

const handleWaitingState = async ({
  context,
  runnerId,
  moduleName,
  captureVars,
  captured,
  actions,
  moduleVariables,
  actionExecutor,
  executedActions,
  isNavigationExecuted,
  markNavigationExecuted,
}: {
  context: RunnerContext;
  runnerId: string;
  moduleName: string;
  captureVars: string[];
  captured: Record<string, string>;
  actions: string[];
  moduleVariables: Record<string, string>;
  actionExecutor: ActionExecutor;
  executedActions: Set<string>;
  isNavigationExecuted: () => boolean;
  markNavigationExecuted: () => void;
}): Promise<void> => {
  if (!isNavigationExecuted()) {
    context.logger.log(`[${moduleName}]: Fetching runner information...`);
    const runnerInfo = await context.api.getRunnerInfo(runnerId, {
      captureVars,
      store: captured,
    });

    context.logger.log(`[${moduleName}]: Running navigation...`);
    const navigated = await navigateToUrl({
      runnerInfo,
      moduleName,
      captured,
      captureVars,
      browserSession: context.browserSession,
      logger: context.logger,
    });
    if (navigated) {
      markNavigationExecuted();
    }
  }

  if (actions.length > 0 && isNavigationExecuted()) {
    await tryExecuteActions({
      context,
      runnerId,
      moduleName,
      actions,
      moduleVariables,
      actionExecutor,
      executedActions,
      captured,
      captureVars,
    });
  }
};

const tryExecuteActions = async ({
  context,
  runnerId,
  moduleName,
  actions,
  moduleVariables,
  actionExecutor,
  executedActions,
  captured,
  captureVars,
}: {
  context: RunnerContext;
  runnerId: string;
  moduleName: string;
  actions: string[];
  moduleVariables: Record<string, string>;
  actionExecutor: ActionExecutor;
  executedActions: Set<string>;
  captured: Record<string, string>;
  captureVars: string[];
}): Promise<void> => {
  const logs = await context.api.getModuleLogs(runnerId, {
    captureVars,
    store: captured,
  });
  captureFromObject(logs, captureVars, captured);
  context.logger.log(`[${moduleName}]: Logs retrieved for action execution.`);

  for (const actionName of actions) {
    if (executedActions.has(actionName)) {
      continue;
    }

    context.logger.log(`[${moduleName}]: Executing action '${actionName}'...`);
    const newlyCaptured = await actionExecutor.executeAction(
      actionName,
      captured,
      moduleVariables
    );
    Object.assign(captured, newlyCaptured);
    executedActions.add(actionName);
    context.logger.log(`[${moduleName}]: Action '${actionName}' completed.`);
  }
};

const navigateToUrl = async ({
  runnerInfo,
  moduleName,
  captured,
  captureVars,
  browserSession,
  logger,
}: {
  runnerInfo: RunnerInfo;
  moduleName: string;
  captured: Record<string, string>;
  captureVars: string[];
  browserSession: BrowserSession;
  logger: Logger;
}): Promise<boolean> => {
  captureFromObject(runnerInfo, captureVars, captured);

  const browser = runnerInfo.browser;
  const directUrl = browser.urls[0];
  const methodUrl = browser.urlsWithMethod.find((entry) => {
    return entry.method.toUpperCase() === "GET";
  })?.url;
  const targetUrl = directUrl ?? methodUrl;

  if (!targetUrl) {
    const urls = browser.urls.length ? browser.urls.join(", ") : "(empty)";
    const urlsWithMethod = browser.urlsWithMethod.length
      ? browser.urlsWithMethod
          .map((entry) => `${entry.method} ${entry.url}`)
          .join(", ")
      : "(empty)";
    logger.log(
      `[${moduleName}]: No browser URL found. urls=${urls} urlsWithMethod=${urlsWithMethod}`
    );
    return false;
  }

  logger.log(`[${moduleName}]: Navigating to URL: ${targetUrl}`);
  captureFromObject(targetUrl, captureVars, captured);
  const finalUrl = await browserSession.navigate(targetUrl);
  captureFromObject(finalUrl, captureVars, captured);
  logger.log(`[${moduleName}]: Navigation completed for URL: ${finalUrl}`);
  return true;
};
