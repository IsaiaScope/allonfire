// nuqs/server: the parsers without nuqs' "use client" entry, so the page (a
// Server Component) and the table read the address through the same ones.
import { USER } from "@allonfire/auth/features/users/constants/users";
import {
  codecParser,
  pageParser,
} from "@allonfire/ui/features/data-table/utils/list-params";
import {
  createLoader,
  type inferParserType,
  parseAsNumberLiteral,
} from "nuqs/server";
import { USERS } from "../constants/users";

/**
 * The Users list's address. A value the list does not allow reads as its
 * default, never an error: the address is the visitor's to edit.
 */
export const usersParams = {
  [USER.PARAM.PAGE]: pageParser(USER.DEFAULT.PAGE, USER.LIMIT.MAX_PAGE)
    .withDefault(USER.DEFAULT.PAGE)
    .withOptions(USERS.HISTORY.PAGE),
  [USER.PARAM.PER_PAGE]: parseAsNumberLiteral(USER.PAGE_SIZES)
    .withDefault(USER.DEFAULT.PAGE_SIZE)
    .withOptions(USERS.HISTORY.PAGE),
  // Typing replaces the history entry; paging pushes one, so Back goes to the
  // previous page. The sort and the hidden columns replace it too.
  [USER.PARAM.SEARCH]: codecParser(USER.SEARCH, USERS.HISTORY.SEARCH),
  [USER.PARAM.SORT]: codecParser(USER.SORT, USERS.HISTORY.SEARCH),
  [USER.PARAM.HIDE]: codecParser(USERS.HIDE, USERS.HISTORY.SEARCH),
};

/** Reads the list's params from a page's `searchParams`. */
export const loadUsersParams = createLoader(usersParams);

export type UsersParams = inferParserType<typeof usersParams>;

/**
 * What the API is asked and the cache is keyed by: the page, its size, the
 * search and the sort. Not `hide`, which only changes what is drawn, so a View
 * change never asks again, never re-keys the private cache and never clears
 * the selection.
 */
export type UsersQuery = Omit<UsersParams, typeof USER.PARAM.HIDE>;

/** The part of the address the API is asked (an explicit pick, never a spread). */
export const queryOf = (params: UsersParams): UsersQuery => ({
  [USER.PARAM.PAGE]: params[USER.PARAM.PAGE],
  [USER.PARAM.PER_PAGE]: params[USER.PARAM.PER_PAGE],
  [USER.PARAM.SEARCH]: params[USER.PARAM.SEARCH],
  [USER.PARAM.SORT]: params[USER.PARAM.SORT],
});
