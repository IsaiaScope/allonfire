// nuqs/server: the parsers without nuqs' "use client" entry, so the page (a
// Server Component) and the table read the address through the same ones.
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import {
  createLoader,
  createParser,
  type inferParserType,
  parseAsNumberLiteral,
} from "nuqs/server";
import { USERS } from "./users";

/** A page the API reads: a whole number from the first to `USER.MAX_PAGE`. */
const pageParser = createParser({
  parse: (value) => {
    const page = Number(value);
    return Number.isInteger(page) &&
      page >= USER.DEFAULT_PAGE &&
      page <= USER.MAX_PAGE
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
  parse: (value) => USER_SEARCH.serialize(USER_SEARCH.parse(value)) || null,
  serialize: String,
})
  .withDefault("")
  .withOptions(USERS.HISTORY.SEARCH);

/**
 * The Users list's address. A value the list does not allow reads as its
 * default, never an error: the address is the visitor's to edit.
 */
export const usersParams = {
  [USER.PARAM.PAGE]: pageParser
    .withDefault(USER.DEFAULT_PAGE)
    .withOptions(USERS.HISTORY.PAGE),
  [USER.PARAM.PER_PAGE]: parseAsNumberLiteral(USER.PAGE_SIZES)
    .withDefault(USER.DEFAULT_PAGE_SIZE)
    .withOptions(USERS.HISTORY.PAGE),
  [USER.PARAM.SEARCH]: searchParser,
};

/** Reads the list's params from a page's `searchParams`. */
export const loadUsersParams = createLoader(usersParams);

export type UsersParams = inferParserType<typeof usersParams>;
