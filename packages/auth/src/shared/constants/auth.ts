import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";

/** Better Auth's email and password sign-in. */
const SIGN_IN_EMAIL = "/sign-in/email";
/** Better Auth's email and password Registration. */
const SIGN_UP_EMAIL = "/sign-up/email";
/** Takes the current password, so a stolen Session could guess it here. */
const CHANGE_PASSWORD = "/change-password";
/**
 * Better Auth's cookie names start with this, behind `__Secure-` on https;
 * signing out clears every cookie that carries it.
 */
const COOKIE_MARKER = "better-auth.";
/** Names the App a request is for: its enum key (`BACK_OFFICE`), as `AUTH_APP`. */
const APP_HEADER = "x-aof-app";
/** The codes this module adds to Better Auth's own error bodies. */
const ERROR_CODE = {
  /** Sign-in named an App that does not let this User in. */
  APP_FORBIDDEN: "APP_FORBIDDEN",
  /** Registration or joining for an App that does not allow it, or no App named. */
  REGISTRATION_CLOSED: "REGISTRATION_CLOSED",
} as const;

/** Everything the Auth module fixes for every host: its paths, cookies, header and limits. */
export const AUTH = {
  /**
   * How long an App's server waits for the API's auth routes. An API that
   * accepts the call and never answers must not hold every page behind it.
   */
  API_TIMEOUT_MS: 10 * UNIT.MS_PER_SECOND,
  COOKIE: {
    MARKER: COOKIE_MARKER,
    /**
     * Better Auth's Session cookie, matched past any `__Secure-` prefix: the
     * signed copy of the Session that spares the API a database read until it
     * expires. The Session itself is read with Better Auth's `getSessionCookie`.
     */
    SESSION_DATA: `${COOKIE_MARKER}session_data`,
    /**
     * Better Auth's Session token, matched past any `__Secure-` prefix: the
     * same for the whole Session, unlike the cookie cache renewed beside it.
     */
    SESSION_TOKEN: `${COOKIE_MARKER}session_token`,
  },
  /**
   * What the docs say about the routes this module adds to Better Auth's. No
   * summary: Better Auth's generator drops it, so every auth route is titled
   * by its path.
   */
  DOC: {
    JOIN_APP: {
      APP_HEADER: "The App to join, by its enum key",
      DESCRIPTION: `Any signed-in User. Adds a Membership in the App \`${APP_HEADER}\` names, at the Role its Registration gives. An App closed to Registration, an unknown name or no header answers 403 \`${ERROR_CODE.REGISTRATION_CLOSED}\`. A Membership already there keeps its Role, so joining never lowers one.`,
      OK: "The App joined",
    },
  },
  ERROR_CODE,
  HEADER: { APP: APP_HEADER },
  /**
   * Every route where Better Auth checks or hashes a password. Hosts
   * rate-limit these harder than anything else: each request is a guess or a
   * hash.
   */
  LIMITED_PATHS: [SIGN_IN_EMAIL, SIGN_UP_EMAIL, CHANGE_PASSWORD],
  /** Methods Better Auth's handler answers. */
  METHODS: [HTTP.METHOD.GET, HTTP.METHOD.POST],
  /** Tag every Better Auth operation carries in a host's OpenAPI document. */
  OPENAPI_TAG: "Auth",
  /**
   * The paths every App serves its home and Sign in at, after the locale
   * (`/it` + path): home is the locale's root, so it adds nothing.
   */
  PAGE: {
    HOME: "",
    SIGN_IN: "/sign-in",
  },
  /** The module's routes, each after `BASE` under the host's own prefix. */
  PATH: {
    /** Where a host mounts the auth routes, under its own prefix. */
    BASE: "/auth",
    CHANGE_PASSWORD,
    /** Better Auth's read of the current Session, Memberships included. */
    GET_SESSION: "/get-session",
    /** Adds a Membership in an App open to Registration; needs a Session. */
    JOIN_APP: "/join-app",
    /** The `openAPI` plugin's reference page; disabled, the host serves its own. */
    OPENAPI_REFERENCE: "/reference",
    /** The `openAPI` plugin's HTTP route; disabled, the schema is read in-process. */
    OPENAPI_SCHEMA: "/open-api/generate-schema",
    SIGN_IN_EMAIL,
    /** Better Auth's sign-out: ends the Session and clears its cookies. */
    SIGN_OUT: "/sign-out",
    SIGN_UP_EMAIL,
    /**
     * Better Auth's edit of the signed-in User's name and picture. Disabled:
     * `User.image` names a stored Avatar that only an Admin sets (the User
     * module), and a User writing their own could name someone else's file.
     */
    UPDATE_USER: "/update-user",
    /**
     * Better Auth's check of the signed-in User's password. Disabled: nothing
     * calls it, and each request would be a guess outside the auth limit.
     */
    VERIFY_PASSWORD: "/verify-password",
  },
  /**
   * Where a sign-in provider keeps the picture it hands Better Auth for
   * `User.image` (Google's), which an App's next/image optimizes like its own
   * (`withProviderPictures`). A new provider adds its host here first, or a
   * dev page holding its picture breaks (next/image refuses an unknown host).
   */
  PICTURE_HOSTS: ["lh3.googleusercontent.com"],
  /**
   * Password guessing gets its own, much smaller bucket than a host's global
   * one. Keyed by IP only: IP+email would let one address spray many accounts.
   * The size and window are env (`AUTH_RATE_LIMIT_*`); these are the defaults.
   */
  RATE_LIMIT: {
    DEFAULT: {
      /** Keeps the auth counters apart from the host's global ones in a shared store. */
      KEY_PREFIX: "auth:",
      /** Leaves room for a household sharing one public IP. */
      MAX: 10,
      WINDOW_MS: 15 * UNIT.MS_PER_MINUTE,
    },
  },
  /** Better Auth signs cookies with this secret; 32 chars is its own minimum advice. */
  SECRET_MIN_LENGTH: 32,
  SESSION: {
    /** How long a signed session copy in the cookie spares a Postgres read. */
    COOKIE_CACHE_MAX_AGE_S: 5 * UNIT.SECONDS_PER_MINUTE,
    /**
     * How long a Session lasts without a visit. Each visit pushes it back to
     * the full length, at most once per `UPDATE_AGE_S`, so only 60 idle days
     * sign a User out.
     */
    EXPIRES_IN_S: 60 * UNIT.SECONDS_PER_DAY,
    /**
     * How long the browser keeps a page's passed Session check
     * (`requireAppSession`, `use cache: private`): navigations within it ask
     * the API nothing. A Role taken away shows pages that long at most; the
     * API checks every request itself, so they show no data.
     */
    PAGE_CHECK_STALE_S: 30 * UNIT.SECONDS_PER_MINUTE,
    /** How often a visit extends the Session: one database write a day at most. */
    UPDATE_AGE_S: UNIT.SECONDS_PER_DAY,
  },
  /** Why a sign in failed; an App translates each one. */
  SIGN_IN_ERROR: {
    /** The API refused: this User has no Membership in the App, or a Role under its floor. */
    FORBIDDEN: "forbidden",
    INVALID: "invalid",
    /** The email or the password was left empty. */
    MISSING: "missing",
    RATE_LIMITED: "rateLimited",
    UNAVAILABLE: "unavailable",
  },
  /** Context keys the Hono adapter sets; a host's bindings include `AuthVariables`. */
  VAR: {
    SESSION: "session",
  },
} as const;
