// @module-tag unit
import { formatSize } from "../format-size";

const MIB = 1024 * 1024;

describe("formatSize", () => {
  it("reads a size in megabytes with two decimals, however small", () => {
    expect(formatSize(0)).toBe("0.00 MB");
    expect(formatSize(31_457)).toBe("0.03 MB");
    expect(formatSize(5 * MIB)).toBe("5.00 MB");
    expect(formatSize(1536 * 1024)).toBe("1.50 MB");
  });

  it("steps up to gigabytes once a size is 1024 MB or more", () => {
    expect(formatSize(1023 * MIB)).toBe("1023.00 MB");
    expect(formatSize(1024 * MIB)).toBe("1.00 GB");
    expect(formatSize(2.5 * 1024 * MIB)).toBe("2.50 GB");
  });

  it("steps up to terabytes once a size is 1024 GB or more, and stops there", () => {
    expect(formatSize(1024 ** 4)).toBe("1.00 TB");
    expect(formatSize(5000 * 1024 ** 4)).toBe("5000.00 TB");
  });
});
