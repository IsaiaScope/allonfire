// @module-tag unit
import { sortingAfter } from "../utils/sorting";

describe("sortingAfter", () => {
  it("puts a chosen column first and keeps the others", () => {
    expect(
      sortingAfter([{ desc: false, id: "size" }], "email", "asc", 3)
    ).toEqual([
      { desc: false, id: "email" },
      { desc: false, id: "size" },
    ]);
  });

  it("moves a column that is already sorted to the front, in its new direction", () => {
    expect(
      sortingAfter(
        [
          { desc: false, id: "size" },
          { desc: false, id: "email" },
        ],
        "email",
        "desc",
        3
      )
    ).toEqual([
      { desc: true, id: "email" },
      { desc: false, id: "size" },
    ]);
  });

  it("clears the column when its current direction is chosen again", () => {
    expect(
      sortingAfter(
        [
          { desc: true, id: "email" },
          { desc: false, id: "size" },
        ],
        "email",
        "desc",
        3
      )
    ).toEqual([{ desc: false, id: "size" }]);
    expect(
      sortingAfter([{ desc: true, id: "email" }], "email", "desc", 3)
    ).toEqual([]);
  });

  it("cuts the sorts past the maximum, the oldest first", () => {
    expect(
      sortingAfter([{ desc: false, id: "size" }], "email", "asc", 1)
    ).toEqual([{ desc: false, id: "email" }]);
    expect(
      sortingAfter(
        [
          { desc: false, id: "a" },
          { desc: false, id: "b" },
          { desc: false, id: "c" },
        ],
        "d",
        "desc",
        3
      )
    ).toEqual([
      { desc: true, id: "d" },
      { desc: false, id: "a" },
      { desc: false, id: "b" },
    ]);
  });
});
