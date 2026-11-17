// @module-tag unit
import { perPageIn, rowsWithout } from "../page-without";

const rowsOf = (...ids: string[]) => ids.map((id) => ({ id }));

describe("rowsWithout", () => {
  it("drops the named rows and keeps the order of the rest", () => {
    expect(
      rowsWithout(rowsOf("a", "b", "c", "d"), 9, new Set(["b", "d"]), 4)
    ).toEqual({ pageCount: 2, rows: rowsOf("a", "c"), total: 7 });
  });

  it("lowers the total by the rows found on this page only", () => {
    expect(
      rowsWithout(rowsOf("a", "b"), 10, new Set(["b", "elsewhere"]), 5)
    ).toEqual({ pageCount: 2, rows: rowsOf("a"), total: 9 });
  });

  it("recomputes the page count from the page size", () => {
    expect(rowsWithout(rowsOf("a", "b", "c"), 21, new Set(["a"]), 10)).toEqual({
      pageCount: 2,
      rows: rowsOf("b", "c"),
      total: 20,
    });
  });

  it("changes nothing when no named row is on the page", () => {
    expect(rowsWithout(rowsOf("a", "b"), 12, new Set(["z"]), 5)).toEqual({
      pageCount: 3,
      rows: rowsOf("a", "b"),
      total: 12,
    });
  });

  it("answers nothing when it would empty the page while rows remain elsewhere", () => {
    expect(
      rowsWithout(rowsOf("a", "b"), 12, new Set(["a", "b"]), 2)
    ).toBeUndefined();
  });

  it("empties the page when that was the last of the rows", () => {
    expect(rowsWithout(rowsOf("a", "b"), 2, new Set(["a", "b"]), 5)).toEqual({
      pageCount: 1,
      rows: [],
      total: 0,
    });
  });
});

describe("perPageIn", () => {
  it("reads the page size from the params in a page's key", () => {
    expect(perPageIn(["things", "page", { perPage: 25 }], "perPage")).toBe(25);
  });

  it("answers nothing for a key without params", () => {
    expect(perPageIn(["things", "page"], "perPage")).toBeUndefined();
  });

  it("answers nothing when the size is not a number", () => {
    expect(
      perPageIn(["things", "page", { perPage: "25" }], "perPage")
    ).toBeUndefined();
  });

  it("answers nothing when the params are not an object", () => {
    expect(perPageIn(["things", "page", "x"], "perPage")).toBeUndefined();
  });
});
