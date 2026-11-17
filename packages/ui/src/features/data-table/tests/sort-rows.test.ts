// @module-tag unit
import {
  addSort,
  canAddSort,
  removeSort,
  replaceSort,
  shownIn,
  usableColumns,
} from "../utils/sort-rows";

const COLUMNS = [
  { id: "created", label: "Created" },
  { id: "size", label: "Size" },
  { id: "access", label: "Access" },
] as const;
const IDS = COLUMNS.map(({ id }) => id);

describe("addSort", () => {
  it("appends the first column not yet used, ascending", () => {
    expect(addSort([], IDS, 3)).toEqual([{ desc: false, id: "created" }]);
    expect(addSort([{ desc: true, id: "created" }], IDS, 3)).toEqual([
      { desc: true, id: "created" },
      { desc: false, id: "size" },
    ]);
  });

  it("adds nothing at the maximum or when every column is used", () => {
    const full = [
      { desc: false, id: "created" },
      { desc: false, id: "size" },
    ];
    expect(addSort(full, IDS, 2)).toEqual(full);
    expect(canAddSort(full, IDS, 2)).toBe(false);
    const all = [...full, { desc: false, id: "access" }];
    expect(addSort(all, IDS, 5)).toEqual(all);
    expect(canAddSort(all, IDS, 5)).toBe(false);
    expect(canAddSort(full, IDS, 3)).toBe(true);
  });
});

describe("usableColumns", () => {
  it("leaves out the columns other rows use, and keeps the row's own", () => {
    const sorting = [
      { desc: false, id: "created" },
      { desc: true, id: "size" },
    ];
    expect(usableColumns(COLUMNS, sorting, 0).map(({ id }) => id)).toEqual([
      "created",
      "access",
    ]);
    expect(usableColumns(COLUMNS, sorting, 1).map(({ id }) => id)).toEqual([
      "size",
      "access",
    ]);
  });
});

describe("removeSort, replaceSort", () => {
  const sorting = [
    { desc: false, id: "a" },
    { desc: false, id: "b" },
    { desc: true, id: "c" },
  ];

  it("removes the sort at an index", () => {
    expect(removeSort(sorting, 1).map(({ id }) => id)).toEqual(["a", "c"]);
  });

  it("changes a sort's column or direction in place", () => {
    expect(replaceSort(sorting, 0, { id: "z" })[0]).toEqual({
      desc: false,
      id: "z",
    });
    expect(replaceSort(sorting, 1, { desc: true })[1]).toEqual({
      desc: true,
      id: "b",
    });
  });
});

describe("shownIn", () => {
  it("answers the hidden columns after one is shown or hidden, in the table's order", () => {
    expect(shownIn(IDS, ["size"], "size", true)).toEqual([]);
    expect(shownIn(IDS, ["access"], "created", false)).toEqual([
      "created",
      "access",
    ]);
    expect(shownIn(IDS, ["size"], "size", false)).toEqual(["size"]);
  });
});
