// @module-tag unit
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { Role } from "@allonfire/database/enums";
import { IconHome } from "@tabler/icons-react";
import type { AppSection } from "../types/app-descriptor";
import { sectionPageProblems } from "./section-guards";

const GATE = "export default signedInPage(";
const section = (path: string, minRole?: Role): AppSection => ({
  icon: IconHome,
  label: path || "home",
  path,
  ...(minRole ? { minRole } : {}),
});

describe("sectionPageProblems", () => {
  let dir = "";
  const page = (path: string, source: string) => {
    mkdirSync(join(dir, path), { recursive: true });
    writeFileSync(join(dir, path, "page.tsx"), source);
  };

  beforeEach(() => {
    dir = mkdtempSync(join(tmpdir(), "section-guards-"));
  });
  afterEach(() => rmSync(dir, { force: true, recursive: true }));

  it("finds nothing when each page is in a Section, gated, and declares its Section's minRole", () => {
    page("", GATE);
    page("upload", `${GATE} minRole: Role.ADMIN`);
    expect(
      sectionPageProblems({
        sections: [section(AUTH.PAGE.HOME), section("/upload", Role.ADMIN)],
        signedInDir: dir,
      })
    ).toEqual({ ungated: [], unlisted: [], unmatchedRole: [] });
  });

  it("names a page no Section owns, and a Section with no page", () => {
    page("", GATE);
    page("stray", GATE);
    const { unlisted } = sectionPageProblems({
      sections: [section(AUTH.PAGE.HOME), section("/missing")],
      signedInDir: dir,
    });
    expect(unlisted.join("\n")).toContain("/stray");
    expect(unlisted.join("\n")).toContain("/missing");
  });

  it("names a page that does not gate itself", () => {
    page("", "export default function Page() {}");
    const { ungated } = sectionPageProblems({
      sections: [section(AUTH.PAGE.HOME)],
      signedInDir: dir,
    });
    expect(ungated.join("\n")).toContain(join(dir, "page.tsx"));
  });

  it("names a gated Section's page that declares another minRole, or none", () => {
    page("", GATE);
    page("wrong", `${GATE} minRole: Role.USER`);
    page("none", GATE);
    const { unmatchedRole } = sectionPageProblems({
      sections: [
        section(AUTH.PAGE.HOME),
        section("/wrong", Role.ADMIN),
        section("/none", Role.ADMIN),
      ],
      signedInDir: dir,
    });
    expect(unmatchedRole.join("\n")).toContain(join(dir, "wrong", "page.tsx"));
    expect(unmatchedRole.join("\n")).toContain(join(dir, "none", "page.tsx"));
  });

  it("names a page that declares a minRole its Section does not have", () => {
    page("", GATE);
    page("open", `${GATE} minRole: Role.ADMIN`);
    const { unmatchedRole } = sectionPageProblems({
      sections: [section(AUTH.PAGE.HOME), section("/open")],
      signedInDir: dir,
    });
    expect(unmatchedRole.join("\n")).toContain(join(dir, "open", "page.tsx"));
  });
});
