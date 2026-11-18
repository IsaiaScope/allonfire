import { readdirSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import type { AppSection } from "../types/app-descriptor";
import { isCurrentSection, sectionHref } from "../utils/sections";

const PAGE_FILE = "page.tsx";
const GATED = "export default signedInPage(";
const ROLE_DECLARATION = /minRole:\s*Role\.(\w+)/;

type Options = { sections: readonly AppSection[]; signedInDir: string };

/** Every page under the signed-in folder, as the path it serves after the locale. */
const signedInPages = (signedInDir: string) =>
  readdirSync(signedInDir, { encoding: "utf8", recursive: true })
    .filter((file) => basename(file) === PAGE_FILE)
    .map((file) => ({
      file: join(signedInDir, file),
      path: dirname(file) === "." ? "" : `/${dirname(file)}`,
    }));

/**
 * What is wrong between an App's Sections and its signed-in pages, as
 * messages naming the file or path at fault:
 * - `unlisted`: a page no Section owns, or a Section with no page.
 * - `ungated`: a page that does not `export default signedInPage(`.
 * - `unmatchedRole`: a page whose `minRole: Role.X` differs from its
 *   Section's (a gated Section's page that declares none, or an open
 *   Section's that declares one).
 */
export const sectionPageProblems = ({ sections, signedInDir }: Options) => {
  const pages = signedInPages(signedInDir);
  const unlisted = [
    ...pages
      .filter(
        ({ path }) =>
          !sections.some((section) =>
            isCurrentSection(sectionHref(path), section.path)
          )
      )
      .map(({ path }) => `no Section owns the page ${path || "/"}`),
    ...sections
      .filter((section) => !pages.some(({ path }) => path === section.path))
      .map(({ path }) => `the Section ${path || "/"} has no page`),
  ];
  const ungated = pages
    .filter(({ file }) => !readFileSync(file, "utf8").includes(GATED))
    .map(({ file }) => `${file} does not ${GATED}…)`);
  const unmatchedRole = pages.flatMap(({ file, path }) => {
    const section = sections.find((row) => row.path === path);
    const declared = readFileSync(file, "utf8").match(ROLE_DECLARATION)?.[1];
    return section && declared !== section.minRole
      ? [
          `${file} declares minRole ${declared ?? "none"}, its Section ${section.minRole ?? "none"}`,
        ]
      : [];
  });
  return { ungated, unlisted, unmatchedRole };
};

/**
 * The three guard tests every App's Sections owe, as `it`s in the App's own
 * suite: each signed-in page is in a Section and each Section has its page;
 * each page gates itself with `signedInPage`; each page declares its
 * Section's `minRole`.
 */
export const sectionGuards = (options: Options) => {
  const problems = () => sectionPageProblems(options);
  it("puts every signed-in page in a Section, and gives every Section its page", () => {
    expect(problems().unlisted).toEqual([]);
  });
  it("gates every signed-in page itself", () => {
    expect(problems().ungated).toEqual([]);
  });
  it("has each page declare its Section's minRole", () => {
    expect(problems().unmatchedRole).toEqual([]);
  });
};
