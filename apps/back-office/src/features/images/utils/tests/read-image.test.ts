// @module-tag unit

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { cacheLife, cacheTag } from "next/cache";
import { sentCookie, stubFetchJson } from "@/shared/tests/fetch-stub";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { SESSION_COOKIE } from "@/shared/tests/session-cookie-mock";
import { IMAGES } from "../../constants/images";
import { readImage } from "../read-image";

vi.mock("next/cache", () => import("@/shared/tests/next-cache-mock"));
vi.mock(
  "@/environment/environment",
  () => import("@/shared/tests/environment-mock")
);
vi.mock(
  "@allonfire/auth/features/next/utils/session-cookie",
  () => import("@/shared/tests/session-cookie-mock")
);

const [IMAGE] = IMAGES_PAGE.images;
const ID = IMAGE?.id ?? "";

describe("readImage", () => {
  it("reads the Image as the Session's cookie, tagged under the list's tag, kept 5 minutes", async () => {
    const fetch = stubFetchJson(IMAGE);
    expect(await readImage(ID)).toEqual(IMAGE);
    expect(cacheTag).toHaveBeenCalledWith(IMAGES.CACHE.TAG);
    expect(cacheLife).toHaveBeenCalledWith(IMAGES.CACHE.LIFE);
    expect(sentCookie(fetch)).toBe(SESSION_COOKIE);
  });

  it("answers null for a 404", async () => {
    stubFetchJson({}, HTTP.STATUS.NOT_FOUND);
    expect(await readImage("missing")).toBeNull();
  });

  it("throws any other refusal, so nothing is kept", async () => {
    stubFetchJson({}, HTTP.STATUS.FORBIDDEN);
    await expect(readImage(ID)).rejects.toThrow();
  });
});
