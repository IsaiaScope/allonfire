// @module-tag unit

import { PODIUM, placeOf } from "../podium";

describe("placeOf", () => {
  it.each([
    [1, 1],
    [2, 2],
    [3, 3],
    [4, null],
    [10, null],
    [0, null],
  ])("rank %i is place %s", (rank, place) => {
    expect(placeOf(rank)).toBe(place);
  });
});

describe("PODIUM", () => {
  it("gives each place its own medal, trophy and tint", () => {
    const places = [1, 2, 3] as const;
    expect(new Set(places.map((place) => PODIUM[place].medal)).size).toBe(3);
    expect(new Set(places.map((place) => PODIUM[place].trophy)).size).toBe(3);
    expect(new Set(places.map((place) => PODIUM[place].tone)).size).toBe(3);
  });
});
