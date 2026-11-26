// @module-tag unit

import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { REPO } from "@allonfire/config/local/repo";
import { LAURA } from "@/shared/constants/laura";

const GUIDE = readFileSync(
  resolve(REPO.ROOT, "docs", "guides", "laura.md"),
  "utf8"
);
const APP = resolve(REPO.APPS, "laura");
const SOURCE = resolve(APP, "src");
const SIGNED_IN = resolve(SOURCE, "app", "[locale]", "(signed-in)");
const PAGES = resolve(SOURCE, "app", "[locale]");

const CODE_SPAN = /`([^`\n]+)`/g;
/** A page's address: not an API path, which holds a version's digit. */
const ROUTE = /^\/[a-z/-]*$/;
const HOME = "/";

const spans = [...GUIDE.matchAll(CODE_SPAN)].map(([, span = ""]) => span);

const sectionPaths = [
  ...new Set(
    LAURA.sections.flatMap((section) => [
      section.path,
      ...("pages" in section ? section.pages.map(({ path }) => path) : []),
    ])
  ),
].map((path) => (path === AUTH.PAGE.HOME ? HOME : path));

const hasPage = (route: string) =>
  [SIGNED_IN, PAGES].some((folder) =>
    existsSync(resolve(folder, `.${route}`, "page.tsx"))
  );

describe("the Laura guide", () => {
  it("names every Section's page, and each has its page file", () => {
    expect(sectionPaths.filter((path) => !spans.includes(path))).toEqual([]);
    expect(sectionPaths.filter((path) => !hasPage(path))).toEqual([]);
  });

  it("names no page that is not there", () => {
    expect(spans.filter((span) => ROUTE.test(span) && !hasPage(span))).toEqual(
      []
    );
  });
});
