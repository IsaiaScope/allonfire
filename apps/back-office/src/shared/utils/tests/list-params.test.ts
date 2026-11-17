// @module-tag unit
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import {
  codecParser,
  hiddenOf,
  pageParser,
  sortingOf,
  sortOf,
  visibilityOf,
} from "../list-params";
import { resolveUpdater } from "../table-pagination";

const PUSH = { clearOnDefault: true, history: "push" } as const;

describe("sortingOf and sortOf", () => {
  it("turn the grammar's items into the table's sorting, and back", () => {
    const items = IMAGE.SORT.parse("size.desc,created.asc");
    const sorting = sortingOf(items);
    expect(sorting).toEqual([
      { desc: true, id: "size" },
      { desc: false, id: "created" },
    ]);
    expect(sortOf(sorting, ["created", "size", "access"])).toEqual(items);
  });

  it("read an empty sort as none", () => {
    expect(sortingOf([])).toEqual([]);
    expect(sortOf([], ["size"])).toEqual([]);
  });

  it("leave out a column the list does not know", () => {
    expect(
      sortOf(
        [
          { desc: false, id: "nope" },
          { desc: true, id: "size" },
        ],
        ["size"]
      )
    ).toEqual([{ column: "size", direction: "desc" }]);
  });
});

describe("visibilityOf and hiddenOf", () => {
  it("invert each other", () => {
    expect(visibilityOf(["size", "apps"])).toEqual({
      apps: false,
      size: false,
    });
    expect(hiddenOf(visibilityOf(["size", "apps"]))).toEqual(["size", "apps"]);
  });

  it("read only the columns set to false as hidden", () => {
    expect(hiddenOf({ apps: true, size: false })).toEqual(["size"]);
    expect(hiddenOf({})).toEqual([]);
  });
});

describe("codecParser", () => {
  const parser = codecParser(IMAGE.SORT, PUSH);

  it("cleans what it reads: the unknown dropped, the rest in the codec's spelling", () => {
    expect(parser.parse("size.up,created.desc")).toBe("created.desc");
    expect(parser.parse("SIZE.ASC")).toBe("size.asc");
  });

  it("reads a value the codec empties as null", () => {
    expect(parser.parse("bogus.asc")).toBeNull();
    expect(parser.parse("")).toBeNull();
  });

  it("writes a value as it is and defaults to the empty string", () => {
    expect(parser.serialize("size.desc")).toBe("size.desc");
    expect(parser.defaultValue).toBe("");
  });
});

describe("resolveUpdater", () => {
  it("takes a value as it is, and a function of the current one", () => {
    expect(resolveUpdater(3, 1)).toBe(3);
    expect(resolveUpdater((old: number) => old + 1, 1)).toBe(2);
  });
});

describe("pageParser", () => {
  const parser = pageParser(1, 100);

  it("reads a whole number from the first page to the last", () => {
    expect(parser.parse("1")).toBe(1);
    expect(parser.parse("100")).toBe(100);
  });

  it("reads anything else as null, so the list falls back to its default", () => {
    for (const raw of ["0", "101", "1.5", "two", ""]) {
      expect(parser.parse(raw)).toBeNull();
    }
  });
});
