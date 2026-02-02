import { applyTemplate } from "./template";

describe("applyTemplate", () => {
  it("replaces template variables in strings", () => {
    const result = applyTemplate("hello {{name}}", { name: "world" });

    expect(result).toBe("hello world");
  });

  it("keeps unknown variables intact", () => {
    const result = applyTemplate("hello {{name}}", {});

    expect(result).toBe("hello {{name}}");
  });

  it("replaces multiple variables in a single string", () => {
    const result = applyTemplate("{{greet}} {{name}}!", { greet: "hi", name: "sam" });

    expect(result).toBe("hi sam!");
  });

  it("applies templating to arrays", () => {
    const input = ["{{a}}", "x", ["{{b}}", 1]];
    const result = applyTemplate(input, { a: "one", b: "two" });

    expect(result).toEqual(["one", "x", ["two", 1]]);
  });

  it("applies templating to objects and nested structures", () => {
    const input = {
      title: "Hello {{name}}",
      nested: {
        list: ["{{item}}", 2, { value: "{{value}}" }],
      },
    };
    const result = applyTemplate(input, { name: "Ana", item: "X", value: "Y" });

    expect(result).toEqual({
      title: "Hello Ana",
      nested: {
        list: ["X", 2, { value: "Y" }],
      },
    });
  });

  it("leaves non-string primitives unchanged", () => {
    expect(applyTemplate(123, { a: "x" })).toBe(123);
    expect(applyTemplate(true, { a: "x" })).toBe(true);
  });

  it("returns null and undefined as-is", () => {
    expect(applyTemplate(null, { a: "x" })).toBeNull();
    expect(applyTemplate(undefined, { a: "x" })).toBeUndefined();
  });

  it("supports keys with underscores and digits", () => {
    const result = applyTemplate("{{user_id}}-{{v2}}", { user_id: "u1", v2: "beta" });

    expect(result).toBe("u1-beta");
  });
});