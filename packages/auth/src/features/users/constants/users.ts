import { HTTP } from "@allonfire/core/features/http/constants/http";
import { searchQuery } from "@allonfire/core/features/search/search-query";
import { sortQuery } from "@allonfire/core/features/search/sort-query";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, Role } from "@allonfire/database/enums";

/** The sizes a list's page comes in. */
const PAGE_SIZES = [25, 50, 100] as const;

/** The User module's own values: its paths, its list's params and its docs. */
/** One User's route, under the module's base. */
const ONE_USER = "/:id";

/**
 * How a Users list's `search` reads: `app:laura role:admin,user
 * created:2026-11-26..2026-11-28 isa` (ADR 0026, ADR 0031).
 */
const SEARCH = searchQuery(
  {
    app: objectValues(App),
    role: objectValues(Role),
  },
  { ranges: ["created"] }
);

/** How a Users list's `sort` reads: `email.asc,created.desc` (ADR 0031); plain columns only. */
const SORT = sortQuery(["email", "created"] as const);

export const USER = {
  /** The page a list opens on, and its size. */
  DEFAULT: {
    PAGE: 1,
    PAGE_SIZE: 25,
  },
  DOC: {
    AVATAR_DELETE: {
      DESCRIPTION:
        "Removes a User's Avatar and deletes its file; a provider's picture is only forgotten, never deleted. The JSON body carries the `version` the change was made on (`ListedUser.version`): when the User changed since, it answers 409 `RESOURCE_CHANGED` and changes nothing. Only a User the Host lets change Users, read from the database at the time of the request.",
      RESPONSE: {
        [HTTP.STATUS.NO_CONTENT]:
          "The picture is removed; their initial shows instead",
      },
      SUMMARY: "Remove a User's Avatar",
    },
    AVATAR_PUT: {
      DESCRIPTION:
        "Sets a User's Avatar from one picture, multipart/form-data `file`: JPEG, PNG, WebP, AVIF or HEIC, whose centre square is stored as a 256x256 AVIF under a new name. The picture it replaces is deleted. The form's `version` is the one the change was made on (`ListedUser.version`, or `UserCreated.version` for a User just added): when the User changed since, it answers 409 `RESOURCE_CHANGED` and changes nothing. Only a User the Host lets change Users, read from the database at the time of the request.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "The new picture's link, signed for the hour; every later read signs its own",
      },
      SUMMARY: "Set a User's Avatar",
    },
    CREATE: {
      DESCRIPTION:
        "Adds a User with a password login and a Membership in each App given. The email is stored lowercased; one already taken answers 409 `EMAIL_TAKEN`. Only a User the Host lets change Users, read from the database at the time of the request, never from a cached Session.",
      RESPONSE: { [HTTP.STATUS.CREATED]: "The new User's id and Version" },
      SUMMARY: "Add a User",
    },
    DELETE: {
      DESCRIPTION:
        "Deletes the Users named, each from every App at once: their Memberships, Sessions, Accounts and Laura scores go with them, and their Images stay without an uploader. Nobody can delete themselves: a list holding the caller's own id answers 403 `CANNOT_DELETE_SELF` and deletes nobody. An id that is not there is skipped as already gone (`deleted` counts the Users that went), so a retry is safe. Only a User the Host lets delete Users, read from the database at the time of the request, never from a cached Session.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "How many of the Users named were deleted; an unknown id is skipped",
      },
      SUMMARY: "Delete Users",
    },
    LIST: {
      DESCRIPTION:
        "Users with their Memberships, newest first unless `sort` says otherwise (`email.asc,created.desc`: a column and a direction in order, at most three, from `email` and `created`; an unknown one is dropped). `search` holds `app:<App>` and `role:<Role>` pairs, each naming one value or several comma-separated (`role:admin,user`, any of them), plus free text matched against the email and the name, and `created:2026-11-26..2026-11-28` (whole UTC days, both ends included; one day as `created:2026-11-26`) keeps the Users created in that range; an unknown field or value is dropped, and a bad `page` or `perPage` falls back to its default, never a 400. Only a User the Host lets list Users.",
      RESPONSE: {
        [HTTP.STATUS.OK]:
          "One page of Users, newest first, with the total that match",
      },
      SUMMARY: "List Users",
    },
    READ: {
      DESCRIPTION:
        "One User with their Memberships, as a list row shows them; an unknown id answers 404. Only a User the Host lets change Users, read from the database at the time of the request.",
      RESPONSE: {
        [HTTP.STATUS.OK]: "The User, their Avatar's link signed for the hour",
      },
      SUMMARY: "Read a User",
    },
    UPDATE: {
      DESCRIPTION:
        "Edits a User: their name, their Memberships (the whole set, replacing theirs) and their password, any of them; the email never changes. A new password ends every Session of theirs, but the caller's own when they edit themselves. Nobody changes their own Membership in the App that manages Users: that answers 403 `CANNOT_CHANGE_OWN_ROLE` and changes nothing. An unknown id answers 404. The body carries the `version` the edit was made on (`ListedUser.version`): when the User changed since, it answers 409 `RESOURCE_CHANGED` and changes nothing. Only a User the Host lets change Users, read from the database at the time of the request.",
      RESPONSE: { [HTTP.STATUS.OK]: "The User as edited" },
      SUMMARY: "Edit a User",
    },
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
  LIMIT: {
    EMAIL_MAX: 254,
    /** The most Users one deletion names: the largest page. */
    MAX_DELETE: Math.max(...PAGE_SIZES),
    /** The furthest page a list reads. */
    MAX_PAGE: 100_000,
    NAME_MAX: 100,
    PASSWORD_MAX: 128,
    PASSWORD_MIN: 12,
    /** A longer `sort` reads as none: three sorts are far shorter. */
    SORT_MAX: 200,
  },
  OPENAPI_TAG: "Users",
  PAGE_SIZES,
  PARAM: {
    /** The hidden columns, `hide=LAURA` (ADR 0031): display only, never asked of the API. */
    HIDE: "hide",
    PAGE: "page",
    PER_PAGE: "perPage",
    SEARCH: "search",
    SORT: "sort",
  },
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
  /** How a Users list's `search` reads (ADR 0026). */
  SEARCH,
  /** How a Users list's `sort` reads (ADR 0031). */
  SORT,
} as const;
