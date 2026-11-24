// @module-tag unit
import { SEARCH } from "../constants/search";
import { keysetCursor } from "../keyset-cursor";

const POSITION = { at: new Date("2026-11-17T10:00:00.123Z"), id: "clx9a" };

describe("keysetCursor", () => {
  it("reads back what it wrote, to the millisecond", () => {
    expect(keysetCursor.schema.parse(keysetCursor.encode(POSITION))).toEqual(
      POSITION
    );
  });

  it("is URL-safe as written", () => {
    const text = keysetCursor.encode(POSITION);
    expect(encodeURIComponent(text)).toBe(text);
  });

  it.each([
    "",
    "123",
    "abc.clx9a",
    "-1.clx9a",
    "123.",
    "123.a b",
    "123.a.b",
    "9999999999999999.clx9a",
    "1".repeat(SEARCH.CURSOR.MAX_LENGTH + 1),
    123,
    undefined,
  ])("refuses %j", (input) => {
    expect(keysetCursor.schema.safeParse(input).success).toBe(false);
  });
});
