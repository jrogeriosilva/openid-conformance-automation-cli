import { z } from "zod";
import { HttpClient, type CaptureContext } from "./httpClient";

export interface ConformanceApiOptions {
  baseUrl: string;
  token: string;
}

const testStateSchema = z.enum([
  "CREATED",
  "CONFIGURED",
  "WAITING",
  "RUNNING",
  "FINISHED",
  "INTERRUPTED",
]);

const testResultSchema = z.enum([
  "PASSED",
  "FAILED",
  "WARNING",
  "SKIPPED",
  "REVIEW",
  "UNKNOWN",
]);

const moduleInfoSchema = z.object({
  id: z.string().optional(),
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    testStateSchema
  ).catch("CREATED"),
  result: z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    testResultSchema
  ).catch("UNKNOWN"),
  redirect_to: z.string().optional(),
  browser: z.record(z.unknown()).optional(),
  expose: z.array(z.record(z.unknown())).optional(),
});

const runnerInfoSchema = z.object({
  id: z.string().optional(),
  status: z.preprocess(
    (value) => (typeof value === "string" ? value.toUpperCase() : value),
    testStateSchema
  ).catch("CREATED"),
  result: z.string().optional().nullable(),
  browser: z
    .object({
      urls: z.array(z.string()).default([]),
      urlsWithMethod: z
        .array(
          z.object({
            url: z.string().min(1),
            method: z.string().min(1).optional().default("GET"),
          })
        )
        .default([]),
    })
    .default({ urls: [], urlsWithMethod: [] }),
});

export type RunnerInfo = z.infer<typeof runnerInfoSchema>;

const moduleLogsSchema = z.array(z.unknown()).catch([]);

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
    const method = "GET";
    const headers = this.client.getAuthHeaders();
    const maskedHeaders = { ...headers };
    if (maskedHeaders.Authorization) {
      maskedHeaders.Authorization = maskedHeaders.Authorization.replace(/Bearer .+/, "Bearer ****");
    }

    console.log("[ConformanceApi] getModuleInfo REQUEST", JSON.stringify({
      endpoint: url,
      method,
      headers: maskedHeaders,
      body: null,
    }, null, 2));

    const response = await this.client.requestJson<unknown>(
      url,
      { method, headers },
      200,
      { capture }
    );

    console.log("[ConformanceApi] getModuleInfo RESPONSE", JSON.stringify({
      endpoint: url,
      status: 200,
      body: response,
    }, null, 2));

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

    return moduleLogsSchema.parse(response);
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

  async deleteRunner(runnerId: string): Promise<void> {
    const url = this.client.buildUrl(`api/runner/${runnerId}`);
    const method = "DELETE";
    const headers = this.client.getAuthHeaders();
    const maskedHeaders = { ...headers };
    if (maskedHeaders.Authorization) {
      maskedHeaders.Authorization = maskedHeaders.Authorization.replace(/Bearer .+/, "Bearer ****");
    }

    console.log("[ConformanceApi] deleteRunner REQUEST", JSON.stringify({
      endpoint: url,
      method,
      headers: maskedHeaders,
      body: null,
    }, null, 2));

    try {
      await this.client.requestJson<unknown>(
        url,
        { method, headers },
        200,
        { allowNonJson: true }
      );
      console.log("[ConformanceApi] deleteRunner RESPONSE", JSON.stringify({
        endpoint: url,
        status: 200,
        body: "(success)",
      }, null, 2));
    } catch (err) {
      console.log("[ConformanceApi] deleteRunner RESPONSE ERROR", JSON.stringify({
        endpoint: url,
        error: err instanceof Error ? err.message : String(err),
      }, null, 2));
      throw err;
    }
  }

}
