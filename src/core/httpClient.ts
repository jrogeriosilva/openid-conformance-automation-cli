import { captureFromObject, captureFromUrl } from "./capture";

export interface CaptureContext {
  captureVars: string[];
  store: Record<string, string>;
}

export interface HttpClientOptions {
  baseUrl?: string;
  token?: string;
  timeoutMs?: number;
}

export class HttpClient {
  private readonly baseUrl: string;
  private readonly token?: string;
  private readonly timeoutMs: number;

  constructor(options: HttpClientOptions) {
    this.baseUrl = (options.baseUrl ?? "").replace(/\/+$/, "");
    this.token = options.token;
    this.timeoutMs = options.timeoutMs ?? 30000;
  }

  async requestJson<T>(
    url: string,
    init: RequestInit,
    expectedStatus: number | number[] | "ok",
    options?: { capture?: CaptureContext; allowNonJson?: boolean }
  ): Promise<T> {
    const expected =
      expectedStatus === "ok"
        ? undefined
        : Array.isArray(expectedStatus)
          ? expectedStatus
          : [expectedStatus];
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      if (expected && !expected.includes(response.status)) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body}`);
      }
      if (!expected && !response.ok) {
        const body = await response.text();
        throw new Error(`HTTP ${response.status}: ${body}`);
      }

      const text = await response.text();
      let parsed: T = {} as T;
      if (text) {
        try {
          parsed = JSON.parse(text) as T;
        } catch (error) {
          if (!options?.allowNonJson) {
            throw new Error(
              `Invalid JSON response: ${error instanceof Error ? error.message : String(error)}`
            );
          }
          parsed = {} as T;
        }
      }

      if (options?.capture) {
        captureFromUrl(url, options.capture.captureVars, options.capture.store);
        if (text && options.allowNonJson) {
          captureFromObject(text, options.capture.captureVars, options.capture.store);
        }
        captureFromObject(parsed, options.capture.captureVars, options.capture.store);
      }

      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }

  buildUrl(endpoint: string): string {
    if (!this.baseUrl) {
      throw new Error("Base URL is required to build URL");
    }
    return new URL(endpoint, this.baseUrl + "/").toString();
  }

  getAuthHeaders(extra?: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...extra,
    };
    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }
    return headers;
  }
}
