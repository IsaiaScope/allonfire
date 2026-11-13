// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { IMAGES } from "../../constants/images";
import { fetchImages, imagesListKey, imagesQuery } from "../images-queries";

const api = hc<ApiType>(LOCAL.URL.TEST_API);
const PARAMS = {
  [IMAGES.PARAM.PAGE]: 2,
  [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
  [IMAGES.PARAM.SEARCH]: "",
};

describe("imagesQuery", () => {
  it("treats a page as fresh as long as the kept copy is", () => {
    expect(imagesQuery(api, PARAMS).staleTime).toBe(
      IMAGES.CACHE.LIFE.stale * UNIT.MS_PER_SECOND
    );
  });

  it("keys a page by the address that asked for it", () => {
    expect(imagesListKey(PARAMS)).toEqual(QUERY.IMAGES.LIST(PARAMS));
  });
});

/** A client whose fetch answers `body` and records the URL it was asked. */
const answering = (body: unknown) => {
  const seen: URL[] = [];
  const client = hc<ApiType>(LOCAL.URL.TEST_API, {
    fetch: (input: RequestInfo | URL) => {
      seen.push(new URL(new Request(input).url));
      return Promise.resolve(Response.json(body));
    },
  });
  return { client, seen };
};

describe("fetchImages", () => {
  it("asks for the numbered page and answers its body", async () => {
    const { client, seen } = answering(IMAGES_PAGE);
    expect(await fetchImages(client, PARAMS)).toEqual(IMAGES_PAGE);
    expect(objectFromEntries(seen[0]?.searchParams ?? [])).toEqual({
      page: "2",
      perPage: String(IMAGES.DEFAULT_PAGE_SIZE),
      search: "",
    });
  });

  it("sends the search as the address holds it, filters and words", async () => {
    const { client, seen } = answering(IMAGES_PAGE);
    await fetchImages(client, {
      ...PARAMS,
      [IMAGES.PARAM.SEARCH]: "access:public input:sea",
    });
    expect(seen[0]?.searchParams.get("search")).toBe("access:public input:sea");
  });
});
