import { HttpClient } from "./httpClient";
import { captureFromObject, captureFromUrl } from "./capture";

jest.mock("./capture", () => ({
  captureFromObject: jest.fn(),
  captureFromUrl: jest.fn(),
}));

const mockFetch = (response: Partial<Response> & { text?: () => Promise<string> }) => {
  const defaultResponse: Partial<Response> = {
    ok: true,
    status: 200,
    text: async () => "",
  };
  (global as any).fetch = jest.fn().mockResolvedValue({ ...defaultResponse, ...response });
};

describe("HttpClient", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("buildUrl throws when baseUrl is missing", () => {
    const client = new HttpClient({});
    expect(() => client.buildUrl("/api/test")).toThrow("Base URL is required to build URL");
  });

  it("buildUrl normalizes trailing slash", () => {
    const client = new HttpClient({ baseUrl: "https://example.com/" });
    expect(client.buildUrl("/api/test")).toBe("https://example.com/api/test");
  });

  it("getAuthHeaders includes bearer token", () => {
    const client = new HttpClient({ token: "abc123" });
    expect(client.getAuthHeaders()).toEqual({
      "Content-Type": "application/json",
      Authorization: "Bearer abc123",
    });
  });

  it("requestJson returns parsed JSON", async () => {
    mockFetch({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ ok: true }),
    });

    const client = new HttpClient({});
    const result = await client.requestJson<{ ok: boolean }>(
      "https://example.com/api",
      { method: "GET" },
      200
    );

    expect(result).toEqual({ ok: true });
  });

  it("requestJson throws on unexpected status", async () => {
    mockFetch({
      status: 500,
      ok: false,
      text: async () => "server error",
    });

    const client = new HttpClient({});
    await expect(
      client.requestJson("https://example.com/api", { method: "GET" }, 200)
    ).rejects.toThrow("HTTP 500: server error");
  });

  it("requestJson allows non-JSON when allowNonJson is true", async () => {
    mockFetch({
      status: 200,
      ok: true,
      text: async () => "not-json",
    });

    const client = new HttpClient({});
    const result = await client.requestJson<Record<string, string>>(
      "https://example.com/api",
      { method: "GET" },
      200,
      { allowNonJson: true }
    );

    expect(result).toEqual({});
  });

  it("requestJson captures vars from url and parsed body", async () => {
    mockFetch({
      status: 200,
      ok: true,
      text: async () => JSON.stringify({ value: "x" }),
    });

    const client = new HttpClient({});
    const capture = { captureVars: ["value"], store: {} as Record<string, string> };

    await client.requestJson(
      "https://example.com/api?value=x",
      { method: "GET" },
      200,
      { capture }
    );

    expect(captureFromUrl).toHaveBeenCalledWith(
      "https://example.com/api?value=x",
      ["value"],
      capture.store
    );
    expect(captureFromObject).toHaveBeenCalledWith({ value: "x" }, ["value"], capture.store);
  });

  it("requestJson captures raw text when allowNonJson is true", async () => {
    mockFetch({
      status: 200,
      ok: true,
      text: async () => "raw-text",
    });

    const client = new HttpClient({});
    const capture = { captureVars: ["value"], store: {} as Record<string, string> };

    await client.requestJson(
      "https://example.com/api",
      { method: "GET" },
      200,
      { capture, allowNonJson: true }
    );

    expect(captureFromObject).toHaveBeenCalledWith("raw-text", ["value"], capture.store);
  });

  it("requestJson throws on invalid JSON when allowNonJson is false", async () => {
    mockFetch({
      status: 200,
      ok: true,
      text: async () => "not-json",
    });

    const client = new HttpClient({});
    await expect(
      client.requestJson("https://example.com/api", { method: "GET" }, 200)
    ).rejects.toThrow("Invalid JSON response");
  });
});
