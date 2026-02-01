import { z } from "zod";
import { HttpClient, type CaptureContext } from "./httpClient";
import type { TestState } from "./types";

export interface ConformanceApiOptions {
  baseUrl: string;
  token: string;
}

const moduleInfoSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional().default("CREATED"),
  result: z.string().optional().nullable(),
  redirect_to: z.string().optional(),
  browser: z.record(z.unknown()).optional(),
  expose: z.array(z.record(z.unknown())).optional(),
});

const runnerInfoSchema = z.object({
  id: z.string().optional(),
  status: z.string().optional(),
  result: z.string().optional().nullable(),
  browser: z
    .object({
      urls: z.array(z.string()).optional(),
      urlsWithMethod: z
        .array(
          z.object({
            url: z.string().min(1),
            method: z.string().min(1).optional(),
          })
        )
        .optional(),
    })
    .optional(),
});

const registerResponseSchema = z.object({
  id: z.string().min(1),
});

export class ConformanceApi {
  private readonly client: HttpClient;

  constructor(options: ConformanceApiOptions) {
    this.client = new HttpClient({
      baseUrl: options.baseUrl,
      token: options.token,
    });
  }

  async registerRunner(
    planId: string,
    testName: string,
    capture?: CaptureContext
  ): Promise<string> {
    const endpoint = this.client.buildUrl("api/runner");
    const url = new URL(endpoint);
    url.searchParams.set("test", testName);
    url.searchParams.set("plan", planId);

    const response = await this.client.requestJson<unknown>(
      url.toString(),
      {
        method: "POST",
        headers: this.client.getAuthHeaders(),
      },
      [200, 201],
      { capture }
    );

    const parsed = registerResponseSchema.parse(response);
    return parsed.id;
  }

  async getModuleInfo(
    runnerId: string,
    capture?: CaptureContext
  ): Promise<z.infer<typeof moduleInfoSchema>> {
    const url = this.client.buildUrl(`api/info/${runnerId}`);
    const response = await this.client.requestJson<unknown>(
      url,
      {
        method: "GET",
        headers: this.client.getAuthHeaders(),
      },
      200,
      { capture }
    );
    return moduleInfoSchema.parse(response);
  }

  async getRunnerInfo(
    runnerId: string,
    capture?: CaptureContext
  ): Promise<z.infer<typeof runnerInfoSchema>> {
    const url = this.client.buildUrl(`api/runner/${runnerId}`);
    const response = await this.client.requestJson<unknown>(
      url,
      {
        method: "GET",
        headers: this.client.getAuthHeaders(),
      },
      200,
      { capture }
    );

    return runnerInfoSchema.parse(response);
  }

  async getModuleLogs(runnerId: string, capture?: CaptureContext): Promise<unknown[]> {
    const url = this.client.buildUrl(`api/log/${runnerId}`);
    const response = await this.client.requestJson<unknown>(
      url,
      {
        method: "GET",
        headers: this.client.getAuthHeaders(),
      },
      200,
      { capture }
    );

    if (Array.isArray(response)) {
      return response;
    }
    return [];
  }

  async startModule(runnerId: string, capture?: CaptureContext): Promise<void> {
    const url = this.client.buildUrl(`api/runner/${runnerId}`);
    await this.client.requestJson<unknown>(
      url,
      {
        method: "POST",
        headers: this.client.getAuthHeaders(),
      },
      [200, 201],
      { capture }
    );
  }

  static toState(value: string | undefined): TestState {
    switch (value) {
      case "CONFIGURED":
      case "WAITING":
      case "RUNNING":
      case "FINISHED":
      case "INTERRUPTED":
      case "CREATED":
        return value;
      default:
        return "CREATED";
    }
  }
}
