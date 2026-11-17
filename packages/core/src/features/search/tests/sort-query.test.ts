// @module-tag unit
import { SEARCH } from "../constants/search";
import { sortQuery } from "../sort-query";

const sort = sortQuery(["created", "size", "access", "email"] as const);

describe("sortQuery", () => {
  it("round-trips a column and its direction, in order", () => {
    const items = sort.parse("created.desc,size.asc");
    expect(items).toEqual([
      { column: "created", direction: "desc" },
      { column: "size", direction: "asc" },
    ]);
    expect(sort.serialize(items)).toBe("created.desc,size.asc");
  });

  it("drops an unknown column, an unknown direction and a missing one", () => {
    expect(sort.parse("bogus.asc,size.up,size,created.desc")).toEqual([
      { column: "created", direction: "desc" },
    ]);
  });

  it("keeps the first direction of a duplicate column", () => {
    expect(sort.parse("size.asc,size.desc")).toEqual([
      { column: "size", direction: "asc" },
    ]);
  });

  it("keeps the first SEARCH.SORT.MAX valid sorts", () => {
    const items = sort.parse("created.asc,size.asc,access.asc,email.asc");
    expect(items).toHaveLength(SEARCH.SORT.MAX);
    expect(items.map(({ column }) => column)).toEqual([
      "created",
      "size",
      "access",
    ]);
  });

  it("reads the spelling of the column list, whatever the case", () => {
    expect(sort.parse("SIZE.DESC")).toEqual([
      { column: "size", direction: "desc" },
    ]);
  });

  it("reads nothing as no sort", () => {
    expect(sort.parse("")).toEqual([]);
    expect(sort.parse(null)).toEqual([]);
    expect(sort.parse(undefined)).toEqual([]);
    expect(sort.serialize([])).toBe("");
  });

  it("reads the hand-edited address of the plan", () => {
    expect(
      sort.serialize(
        sort.parse("bogus.asc,size.up,size.asc,created.desc,email.asc")
      )
    ).toBe("size.asc,created.desc,email.asc");
  });

  it("reads an old spelling of a renamed column as its new one", () => {
    const renamed = sortQuery(["created", "bytes"] as const, [
      { from: "size", to: "bytes" },
      { from: "createdAt", to: "created" },
    ]);
    const items = renamed.parse("size.desc,createdAt.asc");
    expect(items).toEqual([
      { column: "bytes", direction: "desc" },
      { column: "created", direction: "asc" },
    ]);
    expect(renamed.serialize(items)).toBe("bytes.desc,created.asc");
  });

  it("keeps the first of a column and its old spelling", () => {
    const renamed = sortQuery(["bytes"] as const, [
      { from: "size", to: "bytes" },
    ]);
    expect(renamed.parse("size.asc,bytes.desc")).toEqual([
      { column: "bytes", direction: "asc" },
    ]);
  });
});
