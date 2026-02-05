import type {
  ActionConfig,
  ApiActionConfig,
  BrowserActionConfig,
} from "../config/schema";
import { applyTemplate } from "./template";
import { captureFromObject } from "./capture";
import { HttpClient } from "./httpClient";
import { BrowserSession } from "./browserSession";
import { ActionExecutionError } from "./errors";
import type { LogContext } from "./logger";

export interface ActionExecutorOptions {
  captureVars: string[];
  headless: boolean;
  globalVariables?: Record<string, string>;
  browserSession: BrowserSession;
}

export class ActionExecutor {
  private readonly actions: Map<string, ActionConfig>;
  private readonly captureVars: string[];
  private readonly headless: boolean;
  private readonly globalVariables: Record<string, string>;
  private readonly browserSession: BrowserSession;
  private readonly client: HttpClient;

  constructor(actions: ActionConfig[], options: ActionExecutorOptions) {
    this.actions = new Map(actions.map((action) => [action.name, action]));
    this.captureVars = options.captureVars;
    this.headless = options.headless;
    this.globalVariables = options.globalVariables ?? {};
    this.browserSession = options.browserSession;
    this.client = new HttpClient({});
  }

  getAction(name: string): ActionConfig | undefined {
    return this.actions.get(name);
  }

  private mergeVariables(
    captured: Record<string, string>,
    moduleVariables: Record<string, string>
  ): Record<string, string> {
    // Precedence: captured > moduleVariables > globalVariables
    return {
      ...this.globalVariables,
      ...moduleVariables,
      ...captured,
    };
  }

  async executeAction(
    name: string,
    capturedVariables: Record<string, string>,
    moduleVariables: Record<string, string>,
    logContext?: LogContext
  ): Promise<Record<string, string>> {
    const action = this.actions.get(name);
    if (!action) {
      throw new ActionExecutionError(
        name,
        'UNKNOWN',
        `Action '${name}' not found in config`
      );
    }

    try {
      const variables = this.mergeVariables(capturedVariables, moduleVariables);

      if (action.type === "api") {
        return await this.executeApiAction(action, variables);
      } else if (action.type === "browser") {
        return await this.executeBrowserAction(action, variables);
      } else {
        const exhaustive: never = action;
        throw new Error(`Unknown action type: ${exhaustive}`);
      }
    } catch (err) {
      // If it's already an ActionExecutionError, re-throw it
      if (err instanceof ActionExecutionError) {
        throw err;
      }

      // Otherwise, wrap it
      const errorMessage = err instanceof Error ? err.message : String(err);
      throw new ActionExecutionError(
        name,
        action.type,
        `Action execution failed: ${errorMessage}`,
        err instanceof Error ? err : undefined
      );
    }
  }

  private async executeApiAction(
    action: ApiActionConfig,
    variables: Record<string, string>
  ): Promise<Record<string, string>> {
    const endpoint = applyTemplate(action.endpoint, variables) as string;
    const payload = action.payload
      ? (applyTemplate(action.payload, variables) as Record<string, unknown>)
      : undefined;
    const headers = action.headers
      ? (applyTemplate(action.headers, variables) as Record<string, string>)
      : undefined;

    const captured: Record<string, string> = {};
    await this.client.requestJson<unknown>(
      endpoint,
      {
        method: action.method,
        headers: this.client.getAuthHeaders(headers),
        body: payload ? JSON.stringify(payload) : undefined,
      },
      "ok",
      {
        capture: {
          captureVars: this.captureVars,
          store: captured,
        },
        allowNonJson: true,
      }
    );

    return captured;
  }

  private async executeBrowserAction(
    action: BrowserActionConfig,
    variables: Record<string, string>
  ): Promise<Record<string, string>> {
    if (!this.browserSession) {
      throw new Error("Browser session not initialized for browser action");
    }

    const captured: Record<string, string> = {};

    if (action.operation === "navigate") {
      const url = applyTemplate(action.url, variables) as string;
      const finalUrl = await this.browserSession.navigate(url, action.wait_for);
      captureFromObject(finalUrl, this.captureVars, captured);
    } else {
      const exhaustive: never = action.operation;
      throw new Error(`Unknown browser operation: ${exhaustive}`);
    }

    return captured;
  }
}
