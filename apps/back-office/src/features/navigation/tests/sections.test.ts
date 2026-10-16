// @module-tag unit
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import {
  isCurrentSection,
  SECTION,
  SECTIONS,
  sectionHref,
} from "../constants/sections";

const SIGNED_IN = join(
  dirname(fileURLToPath(import.meta.url)),
  "../../../app/[locale]/(signed-in)"
);
const PAGE_FILE = "page.tsx";
const GATED = "export default signedInPage(";
const byPath = (a: string, b: string) => a.localeCompare(b);

/** Every page under (signed-in), as the path it serves after the locale. */
const signedInPages = () =>
  readdirSync(SIGNED_IN, { encoding: "utf8", recursive: true })
    .filter((file) => basename(file) === PAGE_FILE)
    .map((file) => ({
      file: join(SIGNED_IN, file),
      path: dirname(file) === "." ? "" : `/${dirname(file)}`,
    }));

describe("Sections", () => {
  it("lists every signed-in page, and nothing else", () => {
    expect(
      signedInPages()
        .map(({ path }) => path)
        .sort(byPath)
    ).toEqual(SECTIONS.map(({ path }) => path).sort(byPath));
  });

  it("gates every signed-in page itself", () => {
    for (const { file } of signedInPages()) {
      expect(readFileSync(file, "utf8"), file).toContain(GATED);
    }
  });

  it("links Home to the root", () => {
    expect(sectionHref(SECTION.HOME.path)).toBe(METADATA.PATH.ROOT);
    expect(sectionHref(SECTION.USERS.path)).toBe(SECTION.USERS.path);
  });

  it("marks only the Section you are on, Home included", () => {
    const users = sectionHref(SECTION.USERS.path);
    expect(isCurrentSection(users, SECTION.USERS.path)).toBe(true);
    expect(isCurrentSection(users, SECTION.HOME.path)).toBe(false);
    expect(isCurrentSection(METADATA.PATH.ROOT, SECTION.HOME.path)).toBe(true);
  });
});
