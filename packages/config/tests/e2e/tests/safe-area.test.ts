// @module-tag unit
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { appRoutes } from "../safe-area";

let app = "";

const page = (route: string) => {
  const file = join(app, route, "page.tsx");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, "");
};

beforeEach(() => {
  app = mkdtempSync(join(tmpdir(), "app-"));
});
afterEach(() => rmSync(app, { force: true, recursive: true }));

describe("appRoutes", () => {
  it("finds every page, its groups apart and its params kept", () => {
    page("[locale]");
    page("[locale]/sign-in");
    page("[locale]/(signed-in)/users/[id]");
    expect(appRoutes(app)).toEqual([
      { groups: [], path: "/[locale]" },
      { groups: [], path: "/[locale]/sign-in" },
      { groups: ["signed-in"], path: "/[locale]/users/[id]" },
    ]);
  });

  it("skips macOS's ._ twins on an exFAT drive", () => {
    page("[locale]/sign-in");
    writeFileSync(join(app, "[locale]/sign-in/._page.tsx"), "");
    expect(appRoutes(app)).toEqual([{ groups: [], path: "/[locale]/sign-in" }]);
  });
});
