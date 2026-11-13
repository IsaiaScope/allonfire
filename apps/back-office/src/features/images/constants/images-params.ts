// nuqs/server: the parsers without nuqs' "use client" entry, so the page (a
// Server Component) and the table read the address through the same ones.
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import {
  createLoader,
  createParser,
  type inferParserType,
  parseAsNumberLiteral,
} from "nuqs/server";
import { IMAGES } from "./images";

/** A page the API reads: a whole number from the first to `IMAGE.LIMIT.MAX_PAGE`. */
const pageParser = createParser({
  parse: (value) => {
    const page = Number(value);
    return Number.isInteger(page) &&
      page >= IMAGES.DEFAULT_PAGE &&
      page <= IMAGE.LIMIT.MAX_PAGE
      ? page
      : null;
  },
  serialize: String,
});

/**
 * The search, cleaned: an unknown field or value dropped, the rest in its
 * canonical spelling (ADR 0026). Typing replaces the history entry; paging
 * pushes one, so Back goes to the previous page.
 */
const searchParser = createParser({
  parse: (value) => IMAGE.SEARCH.serialize(IMAGE.SEARCH.parse(value)) || null,
  serialize: String,
})
  .withDefault("")
  .withOptions(IMAGES.HISTORY.REPLACE);

/**
 * The Images list's address. A value the list does not allow reads as its
 * default, never an error: the address is the visitor's to edit.
 */
export const imagesParams = {
  [IMAGES.PARAM.PAGE]: pageParser
    .withDefault(IMAGES.DEFAULT_PAGE)
    .withOptions(IMAGES.HISTORY.PUSH),
  [IMAGES.PARAM.PER_PAGE]: parseAsNumberLiteral(IMAGES.PAGE_SIZES)
    .withDefault(IMAGES.DEFAULT_PAGE_SIZE)
    .withOptions(IMAGES.HISTORY.PUSH),
  [IMAGES.PARAM.SEARCH]: searchParser,
};

/** Reads the list's params from a page's `searchParams`. */
export const loadImagesParams = createLoader(imagesParams);

export type ImagesParams = inferParserType<typeof imagesParams>;
