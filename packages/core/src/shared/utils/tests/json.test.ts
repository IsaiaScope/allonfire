// @module-tag unit
import { z } from "zod";
import { jsonFrom, parseJson, parseJsonWith, stringifyJson } from "../json";

describe("parseJson", () => {
  it("parses JSON text", () => {
    expect(parseJson('{"a":[1,"b",null]}')).toEqual({ a: [1, "b", null] });
  });

  it("throws on text that is not JSON", () => {
    expect(() => parseJson("{nope")).toThrow(SyntaxError);
  });
});

describe("parseJsonWith", () => {
  const pointSchema = z.object({ x: z.number(), y: z.number() });

  it("returns the value the schema accepts, typed by it", () => {
    const point = parseJsonWith('{"x":1,"y":2}', pointSchema);
    expect(point.x + point.y).toBe(3);
  });

  it("throws when the JSON does not match the schema", () => {
    expect(() => parseJsonWith('{"x":1}', pointSchema)).toThrow(z.ZodError);
  });
});

describe("stringifyJson", () => {
  it("writes what parseJson reads back", () => {
    const value = { list: [1, true, null], name: "a" };
    expect(parseJson(stringifyJson(value))).toEqual(value);
  });

  it("drops an undefined property, as JSON does", () => {
    expect(stringifyJson({ a: 1, b: undefined })).toBe('{"a":1}');
  });
});

describe("jsonFrom", () => {
  const schema = jsonFrom("meta must be JSON").pipe(z.array(z.number()));

  it("parses JSON text and hands it to the next schema", () => {
    expect(schema.parse("[1,2]")).toEqual([1, 2]);
  });

  it("reports text that is not JSON with the given message", () => {
    const result = schema.safeParse("[1,");
    expect(result.success).toBe(false);
    expect(result.error?.issues.map(({ message }) => message)).toEqual([
      "meta must be JSON",
    ]);
  });
});
