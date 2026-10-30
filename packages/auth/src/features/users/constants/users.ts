import { searchQuery } from "@allonfire/core/features/search/search-query";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";

/** The sizes a list's page comes in. */
const PAGE_SIZES = [25, 50, 100] as const;

/** The User module's own values: its paths, its list's params and its docs. */
/** One User's route, under the module's base. */
const ONE_USER = "/:id";

export const USER = {
  /** The page a list opens on, and the furthest it reads. */
  DEFAULT_PAGE: 1,
  DEFAULT_PAGE_SIZE: 25,
  DOC: {
    AVATAR_DELETE_204: "The picture is removed; their initial shows instead",
    AVATAR_DELETE_DESCRIPTION:
      "Removes a User's Avatar and deletes its file; a provider's picture is only forgotten, never deleted. Only a User the Host lets change Users, read from the database at the time of the request.",
    AVATAR_DELETE_SUMMARY: "Remove a User's Avatar",
    AVATAR_PUT_200:
      "The new picture's link, signed for the hour; every later read signs its own",
    AVATAR_PUT_DESCRIPTION:
      "Sets a User's Avatar from one picture, multipart/form-data `file`: JPEG, PNG, WebP, AVIF or HEIC, whose centre square is stored as a 256x256 AVIF under a new name. The picture it replaces is deleted. Only a User the Host lets change Users, read from the database at the time of the request.",
    AVATAR_PUT_SUMMARY: "Set a User's Avatar",
    CREATE_201: "The new User's id",
    CREATE_DESCRIPTION:
      "Adds a User with a password login and a Membership in each App given. The email is stored lowercased; one already taken answers 409 `EMAIL_TAKEN`. Only a User the Host lets change Users, read from the database at the time of the request, never from a cached Session.",
    CREATE_SUMMARY: "Add a User",
    DELETE_200:
      "How many of the Users named were deleted; an unknown id is skipped",
    DELETE_DESCRIPTION:
      "Deletes the Users named, each from every App at once: their Memberships, Sessions, Accounts and Laura scores go with them, and their Images stay without an uploader. Nobody can delete themselves: a list holding the caller's own id answers 403 `CANNOT_DELETE_SELF` and deletes nobody. Only a User the Host lets delete Users, read from the database at the time of the request, never from a cached Session.",
    DELETE_SUMMARY: "Delete Users",
    LIST_200: "One page of Users, newest first, with the total that match",
    LIST_DESCRIPTION:
      "Users with their Memberships, newest first. `search` holds `app:<App>` and `role:<Role>` pairs, each naming one value or several comma-separated (`role:admin,user`, any of them), plus free text matched against the email and the name; an unknown field or value is dropped, and a bad `page` or `perPage` falls back to its default, never a 400. Only a User the Host lets list Users.",
    LIST_SUMMARY: "List Users",
    READ_200: "The User, their Avatar's link signed for the hour",
    READ_DESCRIPTION:
      "One User with their Memberships, as a list row shows them; an unknown id answers 404. Only a User the Host lets change Users, read from the database at the time of the request.",
    READ_SUMMARY: "Read a User",
    UPDATE_200: "The User as edited",
    UPDATE_DESCRIPTION:
      "Edits a User: their name, their Memberships (the whole set, replacing theirs) and their password, any of them; the email never changes. A new password ends every Session of theirs, but the caller's own when they edit themselves. Nobody changes their own Membership in the App that manages Users: that answers 403 `CANNOT_CHANGE_OWN_ROLE` and changes nothing. An unknown id answers 404. Only a User the Host lets change Users, read from the database at the time of the request.",
    UPDATE_SUMMARY: "Edit a User",
  },
  /** Codes the module throws beyond core's standard ones. */
  ERROR_CODE: {
    /** An edit changed the caller's own Role in the App that manages Users. */
    CANNOT_CHANGE_OWN_ROLE: "CANNOT_CHANGE_OWN_ROLE",
    /** A deletion named the caller's own User. */
    CANNOT_DELETE_SELF: "CANNOT_DELETE_SELF",
    /** An added User's email already belongs to someone. */
    EMAIL_TAKEN: "EMAIL_TAKEN",
  },
  /** What an added User's fields may hold; the password's maximum is Better
   *  Auth's, its minimum longer than Better Auth's 8 for an account an Admin
   *  hands out. */
  LIMIT: { EMAIL_MAX: 254, NAME_MAX: 100, PASSWORD_MAX: 128, PASSWORD_MIN: 12 },
  /** The most Users one deletion names: the largest page. */
  MAX_DELETE: Math.max(...PAGE_SIZES),
  MAX_PAGE: 100_000,
  OPENAPI_TAG: "Users",
  PAGE_SIZES,
  PARAM: { PAGE: "page", PER_PAGE: "perPage", SEARCH: "search" },
  /** The module's routes; a Host mounts it at `BASE` under its own prefix. */
  PATH: {
    /** One User's Avatar: `PUT` sets it, `DELETE` removes it. */
    AVATAR: `${ONE_USER}/avatar`,
    BASE: "/users",
    CREATE: "/",
    DELETE: "/",
    LIST: "/",
    /** One User: `GET` reads them, `PATCH` edits them. */
    ONE: ONE_USER,
  },
} as const;

/** How a Users list's `search` reads: `app:laura role:admin,user isa` (ADR 0026). */
export const USER_SEARCH = searchQuery({
  app: objectValues(App),
  role: objectValues(Role),
});
