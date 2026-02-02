import { captureFromObject, captureFromUrl } from "./capture";

describe("captureFromUrl", () => {
  it("captures matching query params", () => {
    const store: Record<string, string> = {};

    captureFromUrl(
      "https://example.com/callback?state=abc&code=123&empty=",
      ["state", "code", "missing", "empty"],
      store
    );

    expect(store).toEqual({ state: "abc", code: "123" });
  });

  it("ignores invalid urls", () => {
    const store: Record<string, string> = { state: "keep" };

    expect(() =>
      captureFromUrl("not-a-url", ["state"], store)
    ).not.toThrow();

    expect(store).toEqual({ state: "keep" });
  });
});

describe("captureFromObject", () => {
  it("captures from objects, arrays, and embedded urls", () => {
    const store: Record<string, string> = {};

    captureFromObject(
      {
        code: "initial",
        nested: { state: "s1" },
        list: [
          "https://example.com/cb?token=xyz",
          "not-a-url",
          { code: "override" },
        ],
      },
      ["code", "state", "token"],
      store
    );

    expect(store).toEqual({ code: "override", state: "s1", token: "xyz" });
  });
});
