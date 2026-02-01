import type { ActionConfig } from "../config/schema";
import { applyTemplate } from "./template";
import { captureFromObject } from "./capture";
import { HttpClient } from "./httpClient";
import { navigateWithPlaywright } from "./playwrightRunner";

export interface ActionExecutorOptions {
  captureVars: string[];
  headless: boolean;
}

export class ActionExecutor {
  private readonly actions: Map<string, ActionConfig>;
  private readonly captureVars: string[];
  private readonly headless: boolean;
  private readonly client: HttpClient;

  constructor(actions: ActionConfig[], options: ActionExecutorOptions) {
    this.actions = new Map(actions.map((action) => [action.name, action]));
    this.captureVars = options.captureVars;
    this.headless = options.headless;
    this.client = new HttpClient({});
  }

  getAction(name: string): ActionConfig | undefined {
    return this.actions.get(name);
  }

  async executeAction(
    name: string,
    variables: Record<string, string>
  ): Promise<Record<string, string>> {
    const action = this.actions.get(name);
    if (!action) {
      throw new Error(`Action '${name}' not found in config`);
    }

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

    const callbackUrl = action.callback_to
      ? (applyTemplate(action.callback_to, variables) as string)
      : undefined;
    if (callbackUrl) {
      const finalUrl = await navigateWithPlaywright(callbackUrl, this.headless);
      captureFromObject(finalUrl, this.captureVars, captured);
    }

    return captured;
  }
}
