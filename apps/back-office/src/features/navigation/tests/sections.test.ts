// @module-tag unit
import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import {
  currentSection,
  isCurrentSection,
  SECTION,
  SECTIONS,
  sectionHref,
  stationNumber,
} from "../constants/sections";

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

  it("marks a Section on the pages under it, never Home by prefix", () => {
    const user = `${SECTION.USERS.path}/abc`;
    expect(isCurrentSection(user, SECTION.USERS.path)).toBe(true);
    expect(isCurrentSection(user, SECTION.HOME.path)).toBe(false);
    expect(isCurrentSection(`${SECTION.USERS.path}x`, SECTION.USERS.path)).toBe(
      false
    );
    expect(currentSection(user)).toBe(SECTION.USERS);
  });

  it("numbers each Section like a station on the line, in menu order", () => {
    expect(SECTIONS.map(stationNumber)).toEqual(["01", "02", "03"]);
  });

  it("finds the Section you are on, Home for any other path", () => {
    expect(currentSection(sectionHref(SECTION.USERS.path))).toBe(SECTION.USERS);
    expect(currentSection(METADATA.PATH.ROOT)).toBe(SECTION.HOME);
    expect(currentSection("/no-such-section")).toBe(SECTION.HOME);
  });
});
