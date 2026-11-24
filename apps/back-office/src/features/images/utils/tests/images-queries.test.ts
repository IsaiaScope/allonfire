// @module-tag unit

import type { ApiType } from "@allonfire/api/client";
import { LOCAL } from "@allonfire/config/local/addresses";
import { answeringApi } from "@allonfire/core/features/next/api/tests/answering-api";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectFromEntries } from "@allonfire/core/shared/utils/object";
import { hc } from "hono/client";
import { QUERY } from "@/shared/constants/query";
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { IMAGES } from "../../constants/images";
import { queryOf } from "../../constants/images-params";
import {
  fetchImages,
  imageKey,
  imageQuery,
  imagesPageKey,
  imagesQuery,
} from "../images-queries";

const api = hc<ApiType>(LOCAL.URL.TEST_API);
const PARAMS = {
  [IMAGES.PARAM.PAGE]: 2,
  [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
  [IMAGES.PARAM.SEARCH]: "",
  [IMAGES.PARAM.SORT]: "",
};

describe("imagesQuery", () => {
  it("treats a page as fresh as long as the kept copy is", () => {
    expect(imagesQuery(api, PARAMS).staleTime).toBe(
      IMAGES.CACHE.LIFE.stale * UNIT.MS_PER_SECOND
    );
  });

  it("keys a page by the address that asked for it", () => {
    expect(imagesPageKey(PARAMS)).toEqual(QUERY.IMAGES.PAGE(PARAMS));
  });
});

describe("imageQuery", () => {
  it("keys one Image by its id", () => {
    expect(imageKey("image-1")).toEqual(QUERY.IMAGES.ONE("image-1"));
  });

  // Asked again only by an action: never on a clock, a focus or a reconnect
  // (the form's Version must stay the one it opened with).
  it("is never stale, so only an action asks for it again", () => {
    expect(imageQuery(api, "image-1").staleTime).toBe("static");
  });
});

const answering = (body: unknown) =>
  answeringApi(hc<ApiType>, LOCAL.URL.TEST_API, body);

describe("fetchImages", () => {
  it("asks for the numbered page and answers its body", async () => {
    const { client, seen } = answering(IMAGES_PAGE);
    expect(await fetchImages(client, PARAMS)).toEqual(IMAGES_PAGE);
    expect(objectFromEntries(seen[0]?.searchParams ?? [])).toEqual({
      page: "2",
      perPage: String(IMAGES.DEFAULT_PAGE_SIZE),
      search: "",
      sort: "",
    });
  });

  it("sends the search as the address holds it, filters and words", async () => {
    const { client, seen } = answering(IMAGES_PAGE);
    await fetchImages(client, {
      ...PARAMS,
      [IMAGES.PARAM.SEARCH]: "access:public input:sea",
    });
    expect(seen[0]?.searchParams.get(IMAGES.PARAM.SEARCH)).toBe(
      "access:public input:sea"
    );
  });

  it("sends the sort as the address holds it", async () => {
    const { client, seen } = answering(IMAGES_PAGE);
    await fetchImages(client, { ...PARAMS, [IMAGES.PARAM.SORT]: "size.desc" });
    expect(seen[0]?.searchParams.get(IMAGES.PARAM.SORT)).toBe("size.desc");
  });
});

describe("imagesPageKey and the hidden columns", () => {
  it("is the same key whatever the View hides: a View change asks nothing", () => {
    const withHidden = { ...PARAMS, [IMAGES.PARAM.HIDE]: "apps" };
    expect(imagesPageKey(queryOf(withHidden))).toEqual(
      imagesPageKey(queryOf({ ...PARAMS, [IMAGES.PARAM.HIDE]: "" }))
    );
    expect(imagesPageKey(queryOf(withHidden))).toEqual(
      QUERY.IMAGES.PAGE(PARAMS)
    );
  });

  it("keys a sort apart from none", () => {
    expect(
      imagesPageKey({ ...PARAMS, [IMAGES.PARAM.SORT]: "size.desc" })
    ).not.toEqual(imagesPageKey(PARAMS));
  });
});
