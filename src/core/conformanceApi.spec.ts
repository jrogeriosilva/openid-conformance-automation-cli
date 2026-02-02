describe("ConformanceApi", () => {
	function setup() {
		jest.resetModules();

		const mockClient = {
			buildUrl: jest.fn(),
			getAuthHeaders: jest.fn(),
			requestJson: jest.fn(),
		};

		const HttpClientMock = jest.fn().mockImplementation(() => mockClient);

		let ConformanceApi: any;
		let toState: any;

		jest.isolateModules(() => {
			jest.doMock("./httpClient", () => ({
				HttpClient: HttpClientMock,
			}));

			({ ConformanceApi } = require("./conformanceApi"));
			({ toState } = require("./conformanceApi").ConformanceApi);
		});

		return { ConformanceApi, toState, HttpClientMock, mockClient };
	}

	test("registerRunner posts to api/runner with query params", async () => {
		const { ConformanceApi, HttpClientMock, mockClient } = setup();

		mockClient.buildUrl.mockReturnValue("https://example.com/api/runner");
		mockClient.getAuthHeaders.mockReturnValue({ Authorization: "Bearer token" });
		mockClient.requestJson.mockResolvedValue({ id: "runner-1" });

		const api = new ConformanceApi({ baseUrl: "https://example.com", token: "token" });
		const capture = { captureVars: ["id"], store: {} };

		const runnerId = await api.registerRunner("plan-1", "test-1", capture);

		expect(runnerId).toBe("runner-1");
		expect(HttpClientMock).toHaveBeenCalledWith({
			baseUrl: "https://example.com",
			token: "token",
		});
		expect(mockClient.buildUrl).toHaveBeenCalledWith("api/runner");
		expect(mockClient.requestJson).toHaveBeenCalledWith(
			expect.stringContaining("https://example.com/api/runner"),
			{
				method: "POST",
				headers: { Authorization: "Bearer token" },
			},
			[200, 201],
			{ capture }
		);

		const requestUrl = mockClient.requestJson.mock.calls[0][0] as string;
		const parsed = new URL(requestUrl);
		expect(parsed.searchParams.get("plan")).toBe("plan-1");
		expect(parsed.searchParams.get("test")).toBe("test-1");
	});

	test("getModuleInfo parses response and applies defaults", async () => {
		const { ConformanceApi, mockClient } = setup();

		mockClient.buildUrl.mockReturnValue("https://example.com/api/info/runner-1");
		mockClient.getAuthHeaders.mockReturnValue({ Authorization: "Bearer token" });
		mockClient.requestJson.mockResolvedValue({});

		const api = new ConformanceApi({ baseUrl: "https://example.com", token: "token" });
		const result = await api.getModuleInfo("runner-1");

		expect(result.status).toBe("CREATED");
		expect(mockClient.requestJson).toHaveBeenCalledWith(
			"https://example.com/api/info/runner-1",
			{
				method: "GET",
				headers: { Authorization: "Bearer token" },
			},
			200,
			{ capture: undefined }
		);
	});

	test("getRunnerInfo returns parsed runner info", async () => {
		const { ConformanceApi, mockClient } = setup();

		mockClient.buildUrl.mockReturnValue("https://example.com/api/runner/runner-1");
		mockClient.getAuthHeaders.mockReturnValue({ Authorization: "Bearer token" });
		mockClient.requestJson.mockResolvedValue({
			status: "RUNNING",
			browser: { urls: ["https://start"], urlsWithMethod: [{ url: "https://post" }] },
		});

		const api = new ConformanceApi({ baseUrl: "https://example.com", token: "token" });
		const result = await api.getRunnerInfo("runner-1");

		expect(result.status).toBe("RUNNING");
		expect(result.browser?.urls).toEqual(["https://start"]);
		expect(result.browser?.urlsWithMethod?.[0].url).toBe("https://post");
	});

	test("getModuleLogs returns logs array only when response is array", async () => {
		const { ConformanceApi, mockClient } = setup();

		mockClient.buildUrl.mockReturnValue("https://example.com/api/log/runner-1");
		mockClient.getAuthHeaders.mockReturnValue({ Authorization: "Bearer token" });
		mockClient.requestJson.mockResolvedValueOnce([{ entry: 1 }]).mockResolvedValueOnce({});

		const api = new ConformanceApi({ baseUrl: "https://example.com", token: "token" });

		const logs = await api.getModuleLogs("runner-1");
		expect(logs).toEqual([{ entry: 1 }]);

		const empty = await api.getModuleLogs("runner-1");
		expect(empty).toEqual([]);
	});

	test("startModule posts to runner endpoint", async () => {
		const { ConformanceApi, mockClient } = setup();

		mockClient.buildUrl.mockReturnValue("https://example.com/api/runner/runner-1");
		mockClient.getAuthHeaders.mockReturnValue({ Authorization: "Bearer token" });
		mockClient.requestJson.mockResolvedValue({});

		const api = new ConformanceApi({ baseUrl: "https://example.com", token: "token" });

		await api.startModule("runner-1");

		expect(mockClient.requestJson).toHaveBeenCalledWith(
			"https://example.com/api/runner/runner-1",
			{
				method: "POST",
				headers: { Authorization: "Bearer token" },
			},
			[200, 201],
			{ capture: undefined }
		);
	});

	test("toState returns default for unknown values", () => {
		const { toState } = setup();

		expect(toState("WAITING")).toBe("WAITING");
		expect(toState("UNKNOWN")).toBe("CREATED");
		expect(toState(undefined)).toBe("CREATED");
	});
});
