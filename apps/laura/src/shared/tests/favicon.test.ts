// @module-tag unit
// @vitest-environment node
import { readFile } from "node:fs/promises";

const ICO = {
  COUNT_AT: 4,
  DIRECTORY_END: 22,
  SIGNATURE: [0, 0, 1, 0],
} as const;
const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

const favicon = await readFile(
  new URL("../../../public/favicon.ico", import.meta.url)
);

describe("public/favicon.ico", () => {
  it("is an icon file", () => {
    expect([...favicon.subarray(0, ICO.SIGNATURE.length)]).toEqual([
      ...ICO.SIGNATURE,
    ]);
  });

  it("holds one image, a PNG", () => {
    expect(favicon.readUInt16LE(ICO.COUNT_AT)).toBe(1);
    expect([
      ...favicon.subarray(
        ICO.DIRECTORY_END,
        ICO.DIRECTORY_END + PNG_SIGNATURE.length
      ),
    ]).toEqual(PNG_SIGNATURE);
  });
});
