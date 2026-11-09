// @module-tag unit
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { SECTIONS } from "../constants/sections";
import { isCurrentSection, sectionHref } from "../utils/sections";

const SIGNED_IN = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../app/[locale]/(signed-in)"
);
const PAGE_FILE = "page.tsx";
const GATED = "export default signedInPage(";

/** Every page under (signed-in), as the path it serves after the locale. */
const signedInPages = () =>
  readdirSync(SIGNED_IN, { encoding: "utf8", recursive: true })
    .filter((file) => basename(file) === PAGE_FILE)
    .map((file) => ({
      file: join(SIGNED_IN, file),
      path: dirname(file) === "." ? "" : `/${dirname(file)}`,
    }));

describe("Sections", () => {
  it("puts every signed-in page in a Section, and gives every Section its page", () => {
    const paths = signedInPages().map(({ path }) => path);
    for (const path of paths) {
      expect(
        SECTIONS.some((section) =>
          isCurrentSection(sectionHref(path), section.path)
        ),
        path
      ).toBe(true);
    }
    for (const { path } of SECTIONS) {
      expect(paths, path).toContain(path);
    }
  });

  it("gates every signed-in page itself", () => {
    for (const { file } of signedInPages()) {
      expect(readFileSync(file, "utf8"), file).toContain(GATED);
    }
  });
});
