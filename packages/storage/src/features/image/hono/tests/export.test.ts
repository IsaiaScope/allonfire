// @module-tag unit

import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { errorOf } from "@allonfire/auth/shared/tests/test-host";
import type { AuthSession } from "@allonfire/auth/shared/types/auth";
import { ERROR } from "@allonfire/core/features/errors/constants/error-codes";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { App, ImageAccess, Role } from "@allonfire/database/enums";
import { STORAGE } from "../../../../shared/constants/paths";
import { IMAGE } from "../../constants/image";
import { plainAvif } from "../../tests/exif-image";
import { JPEG_SIGNATURE, signatureOf } from "../../tests/jpeg-signature";
import { exportName } from "../../utils/export-name";
import type { ImageDeps } from "../utils/deps";
import { imageHost as app, imageRecord } from "./stub-image-deps";

const exportPath = (id: string) =>
  `${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id })}`;

const lauraUser = sessionFor({
  memberships: [{ app: App.LAURA, role: Role.USER }],
});
const otherAppUser = sessionFor({ memberships: [] });
const visitor: AuthSession | null = null;
const RECORD = imageRecord();

/** The stored file every read answers: a real AVIF, as the bucket holds. */
let source: Buffer;
beforeAll(async () => {
  source = await plainAvif();
});

const readObject = () =>
  vi.fn<ImageDeps["readObject"]>(async () => Buffer.from(source));

describe("GET /images/:id/export", () => {
  it("sends a visible private Image as a JPEG attachment", async () => {
    const read = readObject();
    const res = await app(lauraUser, {
      getImage: async () => RECORD,
      readObject: read,
    }).request(exportPath(RECORD.id));
    expect(res.status).toBe(HTTP.STATUS.OK);
    expect(res.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.EXPORT.CONTENT_TYPE
    );
    expect(res.headers.get(HTTP.HEADER.CONTENT_DISPOSITION)).toBe(
      `attachment; filename="${exportName({ createdAt: RECORD.createdAt.toISOString(), id: RECORD.id })}"`
    );
    expect(res.headers.get(HTTP.HEADER.CACHE_CONTROL)).toBe(
      HTTP.CACHE_CONTROL.PRIVATE_NO_STORE
    );
    expect(res.headers.get(HTTP.HEADER.X_CONTENT_TYPE_OPTIONS)).toBe(
      HTTP.NO_SNIFF
    );
    expect(read).toHaveBeenCalledWith(RECORD.key);
    const body = Buffer.from(await res.arrayBuffer());
    expect(signatureOf(body)).toEqual(JPEG_SIGNATURE);
  });

  it("never shows the stored key in a header", async () => {
    const res = await app(lauraUser, {
      getImage: async () => RECORD,
      readObject: readObject(),
    }).request(exportPath(RECORD.id));
    const headers = [...res.headers].flat().join("\n");
    expect(headers).not.toContain(RECORD.key);
  });

  it("needs a Session even for a public Image", async () => {
    const read = readObject();
    const res = await app(visitor, {
      getImage: async () => imageRecord({ access: ImageAccess.PUBLIC }),
      readObject: read,
    }).request(exportPath(RECORD.id));
    expect(res.status).toBe(HTTP.STATUS.UNAUTHORIZED);
    expect(read).not.toHaveBeenCalled();
  });

  it("answers 404 for an Image the User cannot see, with the body of a missing id", async () => {
    const read = readObject();
    const hidden = await app(otherAppUser, {
      getImage: async () => RECORD,
      readObject: read,
    }).request(exportPath(RECORD.id));
    const missing = await app(otherAppUser, {
      getImage: async () => null,
      readObject: read,
    }).request(exportPath(RECORD.id));
    expect(hidden.status).toBe(HTTP.STATUS.NOT_FOUND);
    expect((await errorOf(hidden.clone())).code).toBe(ERROR.CODE.NOT_FOUND);
    expect(await hidden.json()).toEqual(await missing.json());
    expect(read).not.toHaveBeenCalled();
  });
});

describe("an Export of a stored file that does not decode", () => {
  it("answers 500 with a coded error", async () => {
    const res = await app(lauraUser, {
      getImage: async () => RECORD,
      readObject: async () => Buffer.from("not a picture"),
    }).request(exportPath(RECORD.id));
    expect(res.status).toBe(HTTP.STATUS.INTERNAL_SERVER_ERROR);
    expect(await errorOf(res)).toMatchObject({
      code: ERROR.CODE.INTERNAL_ERROR,
    });
  });
});

describe("the host's Export limiter", () => {
  async function counted(path: string, method: string): Promise<number> {
    const limitExport = vi.fn<ImageDeps["limitExport"]>(async (c) =>
      c.body(null, HTTP.STATUS.TOO_MANY_REQUESTS)
    );
    await app(visitor, { getImage: async () => null, limitExport }).request(
      path,
      { method }
    );
    return limitExport.mock.calls.length;
  }

  it("runs on every request the Export route answers, HEAD included", async () => {
    expect(await counted(exportPath(RECORD.id), HTTP.METHOD.GET)).toBe(1);
    expect(await counted(exportPath(RECORD.id), HTTP.METHOD.HEAD)).toBe(1);
  });

  it("leaves a read of one Image uncounted", async () => {
    const one = `${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.ONE, { id: RECORD.id })}`;
    expect(await counted(one, HTTP.METHOD.GET)).toBe(0);
  });
});
