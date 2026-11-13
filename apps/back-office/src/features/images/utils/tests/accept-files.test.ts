// @module-tag unit
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { acceptFiles } from "../accept-files";

/** A file reporting `size` bytes, without holding them in memory. */
const fileOfSize = (size: number, name = "photo.jpg") => {
  const file = new File([""], name, { type: "image/jpeg" });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

const NOTHING_HELD = { bytes: 0, count: 0 };

describe("acceptFiles", () => {
  it("takes every file that fits and refuses none", () => {
    const files = [fileOfSize(1), fileOfSize(2)];
    expect(acceptFiles(NOTHING_HELD, files)).toEqual({
      accepted: files,
      refused: null,
    });
  });

  it("takes files up to the most one upload holds and refuses the rest as too many", () => {
    const files = Array.from({ length: IMAGE.LIMIT.FILES_PER_UPLOAD + 1 }, () =>
      fileOfSize(1)
    );
    const result = acceptFiles(NOTHING_HELD, files);
    expect(result.accepted).toHaveLength(IMAGE.LIMIT.FILES_PER_UPLOAD);
    expect(result.refused).toBe("tooManyFiles");
  });

  it("counts the files already held", () => {
    const held = { bytes: 0, count: IMAGE.LIMIT.FILES_PER_UPLOAD - 1 };
    const result = acceptFiles(held, [fileOfSize(1), fileOfSize(1)]);
    expect(result.accepted).toHaveLength(1);
    expect(result.refused).toBe("tooManyFiles");
  });

  it("skips a file over the file limit and keeps the others", () => {
    const big = fileOfSize(IMAGE.LIMIT.FILE_BYTES + 1);
    const small = fileOfSize(1);
    expect(acceptFiles(NOTHING_HELD, [big, small])).toEqual({
      accepted: [small],
      refused: "fileTooLarge",
    });
  });

  it("skips a file that would take the upload past its limit", () => {
    const held = { bytes: IMAGE.LIMIT.UPLOAD_BYTES - 1, count: 1 };
    const result = acceptFiles(held, [fileOfSize(2)]);
    expect(result).toEqual({ accepted: [], refused: "totalTooLarge" });
  });
});
