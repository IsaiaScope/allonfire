import { resolve } from "node:path";

/** The Image Fixtures' source files, one per accepted format plus a GIF. */
export const IMAGE_FIXTURE_FILES = resolve(import.meta.dirname, "../files");
