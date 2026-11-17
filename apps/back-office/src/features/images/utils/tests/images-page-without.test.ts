// @module-tag unit
import { IMAGES_PAGE } from "@/shared/tests/msw/handlers";
import { imagesPageWithout } from "../images-page-without";

const [SEA, HILLS] = IMAGES_PAGE.images;
const MORE = { ...IMAGES_PAGE, pageCount: 2, total: 12 };

describe("imagesPageWithout", () => {
  it("drops the named Images and lowers the total and page count", () => {
    expect(imagesPageWithout(MORE, new Set([SEA?.id ?? ""]), 10)).toEqual({
      ...MORE,
      images: [HILLS],
      pageCount: 2,
      total: 11,
    });
  });

  it("lowers the page count when a page is no longer needed", () => {
    expect(
      imagesPageWithout(
        { ...IMAGES_PAGE, pageCount: 2, total: 11 },
        new Set([SEA?.id ?? ""]),
        10
      ).pageCount
    ).toBe(1);
  });

  it("changes nothing when no named Image is on the page", () => {
    expect(imagesPageWithout(MORE, new Set(["absent"]), 10)).toEqual(MORE);
  });

  it("keeps the page as it is when it would empty while Images remain elsewhere", () => {
    expect(
      imagesPageWithout(
        MORE,
        new Set(IMAGES_PAGE.images.map(({ id }) => id)),
        10
      )
    ).toBe(MORE);
  });

  it("empties the page when those were the last Images", () => {
    expect(
      imagesPageWithout(
        IMAGES_PAGE,
        new Set(IMAGES_PAGE.images.map(({ id }) => id)),
        10
      )
    ).toEqual({ ...IMAGES_PAGE, images: [], pageCount: 1, total: 0 });
  });
});
