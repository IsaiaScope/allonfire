/** Next's build folder, relative to the App's folder. */
const BUILD_DIR = ".next";

/** The first segment of every URL Next serves itself: its assets and image optimizer. */
const INTERNALS = "_next";

/** Next's own folders, files and URLs, which core's config and PWA build read. */
export const NEXT = {
  BUILD_DIR,
  /** The file `next build` writes its build id to. */
  BUILD_ID: `${BUILD_DIR}/BUILD_ID`,
  /** A header or rewrite source matching every path. */
  EVERY_PATH: "/(.*)",
  INTERNALS,
  /** Next's hashed files on disk, and the URL prefix it serves them under. */
  STATIC_DIR: `${BUILD_DIR}/static`,
  STATIC_URL: `/${INTERNALS}/static/`,
} as const;
