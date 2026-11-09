/** Regular expressions shared across core and its packages, grouped by use. */
export const PATTERN = {
  /** A Liquibase changeset's file and the name `pnpm db:changeset` takes. */
  CHANGESET: {
    /** Any numbered `.sql`, hand-named ones included, so none shares a number. */
    FILE: /^\d{4}-.+\.sql$/,
    /** Kebab case: `add-photo-alt`. */
    NAME: /^[a-z0-9]+(-[a-z0-9]+)*$/,
  },
  /** One character of each kind, in any script with case: a letter without
   *  case (CJK, Arabic) is neither lowercase nor uppercase, and anything
   *  that is not a letter or a digit is a symbol; whitespace is none of
   *  these, a password has none (`WHITESPACE`). */
  CHARACTER: {
    DIGIT: /\p{Nd}/u,
    LOWERCASE: /\p{Ll}/u,
    SYMBOL: /[^\p{L}\p{Nd}]/u,
    UPPERCASE: /\p{Lu}/u,
    WHITESPACE: /\s/u,
  },
  /** The telemetry env's keys (`TELEMETRY_*`). */
  TELEMETRY: {
    /** `key=value,key=value`, each value percent-encoded, per the OTel spec. */
    HEADERS: /^[^=,]+=[^,]+(,[^=,]+=[^,]+)*$/,
    /** OTLP over HTTP only: a gRPC or bare `host:port` endpoint is a typo here. */
    PROTOCOL: /^https?$/,
  },
  /** Stripped from a URL or path before comparing or appending to it. */
  TRAILING_SLASHES: /\/+$/,
  /** One or more spaces, tabs or line breaks: what splits a search into words. */
  WHITESPACE: /\s+/,
} as const;
