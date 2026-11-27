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
  /** An Export's file name: `2026-11-25-1a2b3c4d.jpg` (storage's `exportName`). */
  EXPORT_FILE_NAME: /^\d{4}-\d{2}-\d{2}-[0-9a-z]{8}\.jpg$/,
  /** A day as the lists write it: `2026-11-26` (a real day is checked beside it). */
  ISO_DAY: /^\d{4}-\d{2}-\d{2}$/,
  /** A whole-line comment in a `turbo.json`, dropped before it is parsed. */
  JSONC_LINE_COMMENT: /^\s*\/\/.*$/gm,
  /** A Release's numbers (`features/ci/release-versions`). */
  RELEASE: {
    /** What an App's account menu shows: `v0.12.0`. */
    BADGE: /^v\d+\.\d+\.\d+$/,
    /** `major.minor.patch`, three whole numbers. */
    VERSION: /^\d+\.\d+\.\d+$/,
    /** A package.json's own `"version"` line (two spaces in), never a nested one. */
    VERSION_LINE: /^( {2}"version": ")[^"]*(")/m,
    /** A workspace entry of `pnpm-workspace.yaml`: `- "apps/*"`, `- "!x"`. */
    WORKSPACE_ENTRY: /^\s*-\s*["']?(!?)([^"'\s]+)["']?\s*(?:#.*)?$/,
    /** A top-level key of `pnpm-workspace.yaml`, which ends the list before it. */
    WORKSPACE_KEY: /^([A-Za-z][\w-]*):/,
  },
  /** One letter of a script that needs its own handling. */
  SCRIPT: {
    /** Written without capitals: uppercasing a letter switches alphabet. */
    GEORGIAN: /\p{Script=Georgian}/u,
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
