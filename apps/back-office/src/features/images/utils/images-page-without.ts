import { rowsWithout } from "@/shared/utils/page-without";
import type { fetchImages } from "./images-queries";

/** One page of the Images list, as the API answers it. */
export type ImagesPage = Awaited<ReturnType<typeof fetchImages>>;

/**
 * The page with the Images named by `ids` taken out, for a deletion shown
 * before the API answers (`rowsWithout`): the total and page count follow, at
 * `perPage` Images a page. A page that would be left empty while Images remain
 * elsewhere is returned as it is.
 */
export const imagesPageWithout = (
  page: ImagesPage,
  ids: ReadonlySet<string>,
  perPage: number
): ImagesPage => {
  const rest = rowsWithout(page.images, page.total, ids, perPage);
  return rest
    ? {
        ...page,
        images: rest.rows,
        pageCount: rest.pageCount,
        total: rest.total,
      }
    : page;
};
