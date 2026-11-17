// nuqs/server: the parsers without nuqs' "use client" entry, so the page (a
// Server Component) and the table read the address through the same ones.
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import {
  createLoader,
  type inferParserType,
  parseAsNumberLiteral,
} from "nuqs/server";
import { codecParser, pageParser } from "@/shared/utils/list-params";
import { IMAGES } from "./images";

/**
 * The Images list's address. A value the list does not allow reads as its
 * default, never an error: the address is the visitor's to edit.
 */
export const imagesParams = {
  [IMAGES.PARAM.PAGE]: pageParser(IMAGES.DEFAULT_PAGE, IMAGE.LIMIT.MAX_PAGE)
    .withDefault(IMAGES.DEFAULT_PAGE)
    .withOptions(IMAGES.HISTORY.PUSH),
  [IMAGES.PARAM.PER_PAGE]: parseAsNumberLiteral(IMAGES.PAGE_SIZES)
    .withDefault(IMAGES.DEFAULT_PAGE_SIZE)
    .withOptions(IMAGES.HISTORY.PUSH),
  // Typing replaces the history entry; paging pushes one, so Back goes to the
  // previous page. The sort and the hidden columns replace it too.
  [IMAGES.PARAM.SEARCH]: codecParser(IMAGE.SEARCH, IMAGES.HISTORY.REPLACE),
  [IMAGES.PARAM.SORT]: codecParser(IMAGE.SORT, IMAGES.HISTORY.REPLACE),
  [IMAGES.PARAM.HIDE]: codecParser(IMAGES.HIDE, IMAGES.HISTORY.REPLACE),
};

/** Reads the list's params from a page's `searchParams`. */
export const loadImagesParams = createLoader(imagesParams);

export type ImagesParams = inferParserType<typeof imagesParams>;

/**
 * What the API is asked and the cache is keyed by: the page, its size, the
 * search and the sort. Not `hide`, which only changes what is drawn, so a View
 * change never asks again, never re-keys the private cache and never clears
 * the selection.
 */
export type ImagesQuery = Omit<ImagesParams, typeof IMAGES.PARAM.HIDE>;

/** The part of the address the API is asked (an explicit pick, never a spread). */
export const queryOf = (params: ImagesParams): ImagesQuery => ({
  [IMAGES.PARAM.PAGE]: params[IMAGES.PARAM.PAGE],
  [IMAGES.PARAM.PER_PAGE]: params[IMAGES.PARAM.PER_PAGE],
  [IMAGES.PARAM.SEARCH]: params[IMAGES.PARAM.SEARCH],
  [IMAGES.PARAM.SORT]: params[IMAGES.PARAM.SORT],
});
