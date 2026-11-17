// @module-tag unit

import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IMAGES } from "../constants/images";
import { loadImagesParams, queryOf } from "../constants/images-params";

const DEFAULTS = {
  [IMAGES.PARAM.PAGE]: IMAGES.DEFAULT_PAGE,
  [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
  [IMAGES.PARAM.SEARCH]: "",
  [IMAGES.PARAM.SORT]: "",
  [IMAGES.PARAM.HIDE]: "",
};
/** Any page past the first. */
const SOME_PAGE = 3;

describe("loadImagesParams", () => {
  it("reads nothing as the first page, no App filter", () => {
    expect(loadImagesParams({})).toEqual(DEFAULTS);
  });

  it.each(["0", "-3", "abc", "1.5", String(IMAGE.LIMIT.MAX_PAGE + 1)])(
    "reads page=%s as the first page",
    (page) => {
      expect(loadImagesParams({ [IMAGES.PARAM.PAGE]: page })).toEqual(DEFAULTS);
    }
  );

  it("keeps a page and a page size it allows", () => {
    const [, perPage] = IMAGES.PAGE_SIZES;
    expect(
      loadImagesParams({
        [IMAGES.PARAM.PAGE]: String(SOME_PAGE),
        [IMAGES.PARAM.PER_PAGE]: String(perPage),
      })
    ).toEqual({
      [IMAGES.PARAM.PAGE]: SOME_PAGE,
      [IMAGES.PARAM.PER_PAGE]: perPage,
      [IMAGES.PARAM.SEARCH]: "",
      [IMAGES.PARAM.SORT]: "",
      [IMAGES.PARAM.HIDE]: "",
    });
  });

  it("keeps the filters and the text in one search, in their canonical spelling", () => {
    expect(
      loadImagesParams({
        [IMAGES.PARAM.SEARCH]:
          "  APP:Back_Office,laura access:Public the   sea ",
      })[IMAGES.PARAM.SEARCH]
    ).toBe("access:public app:laura,back_office input:the sea");
  });

  it("reads a plain word as the text, and a blank search as none", () => {
    expect(
      loadImagesParams({ [IMAGES.PARAM.SEARCH]: "sea" })[IMAGES.PARAM.SEARCH]
    ).toBe("input:sea");
    expect(
      loadImagesParams({ [IMAGES.PARAM.SEARCH]: "   " })[IMAGES.PARAM.SEARCH]
    ).toBe("");
  });

  it("drops a field or value it does not know, never an error", () => {
    expect(
      loadImagesParams({
        [IMAGES.PARAM.SEARCH]: "access:secret app:no-such color:red",
      })[IMAGES.PARAM.SEARCH]
    ).toBe("");
  });

  it("reads an unknown page size as its default", () => {
    expect(loadImagesParams({ [IMAGES.PARAM.PER_PAGE]: "7" })).toEqual(
      DEFAULTS
    );
  });
});

describe("loadImagesParams sort and hide", () => {
  it("reads the sort and the hidden columns", () => {
    const params = loadImagesParams({
      [IMAGES.PARAM.HIDE]: "apps",
      [IMAGES.PARAM.SORT]: "size.desc,created.asc",
    });
    expect(params[IMAGES.PARAM.SORT]).toBe("size.desc,created.asc");
    expect(params[IMAGES.PARAM.HIDE]).toBe("apps");
  });

  it("opens a hand-edited address: the unknown dropped, a duplicate kept once, the fourth cut, the picture never hidden", () => {
    const params = loadImagesParams({
      [IMAGES.PARAM.HIDE]: "image,alt,nope",
      [IMAGES.PARAM.SORT]: "bogus.asc,size.up,size.asc,created.desc,email.asc",
    });
    expect(params[IMAGES.PARAM.SORT]).toBe("size.asc,created.desc");
    expect(params[IMAGES.PARAM.HIDE]).toBe("alt");
  });

  it("keeps the hidden columns in the table's order", () => {
    expect(
      loadImagesParams({ [IMAGES.PARAM.HIDE]: "apps,size" })[IMAGES.PARAM.HIDE]
    ).toBe("size,apps");
  });
});

describe("queryOf", () => {
  it("drops the hidden columns and keeps the rest: a View change asks nothing", () => {
    const params = loadImagesParams({
      [IMAGES.PARAM.HIDE]: "apps",
      [IMAGES.PARAM.SEARCH]: "sea",
      [IMAGES.PARAM.SORT]: "size.desc",
    });
    expect(queryOf(params)).toEqual({
      [IMAGES.PARAM.PAGE]: IMAGES.DEFAULT_PAGE,
      [IMAGES.PARAM.PER_PAGE]: IMAGES.DEFAULT_PAGE_SIZE,
      [IMAGES.PARAM.SEARCH]: "input:sea",
      [IMAGES.PARAM.SORT]: "size.desc",
    });
  });
});
