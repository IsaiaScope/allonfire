// @module-tag unit

import { IMAGE } from "../../constants/image";
import { exportName } from "../export-name";

const ID = "1a2b3c4d-5e6f-7a8b-9c0d-1e2f3a4b5c6d";

describe("exportName", () => {
  it("is the created UTC date, the first 8 id characters and the extension", () => {
    expect(exportName({ createdAt: "2026-11-25T08:30:00.000Z", id: ID })).toBe(
      "2026-11-25-1a2b3c4d.jpg"
    );
  });

  it("gives two Images of one day two names", () => {
    const createdAt = "2026-11-25T08:30:00.000Z";
    expect(exportName({ createdAt, id: ID })).not.toBe(
      exportName({ createdAt, id: "ffffffff-5e6f-7a8b-9c0d-1e2f3a4b5c6d" })
    );
  });

  it("reads the UTC date, whatever offset the timestamp is written in", () => {
    expect(exportName({ createdAt: "2026-11-25T23:59:59.999Z", id: ID })).toBe(
      "2026-11-25-1a2b3c4d.jpg"
    );
    expect(
      exportName({ createdAt: "2026-11-26T01:30:00.000+02:00", id: ID })
    ).toBe("2026-11-25-1a2b3c4d.jpg");
  });

  it("never carries the stored file's extension", () => {
    expect(
      exportName({ createdAt: "2026-11-25T08:30:00.000Z", id: ID })
    ).not.toContain(IMAGE.FORMAT.EXTENSION);
  });
});
