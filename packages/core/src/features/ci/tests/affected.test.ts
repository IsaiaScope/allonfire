// @module-tag unit
import { stringifyJson } from "../../../shared/utils/json";
import { affectedFrom, everything } from "../affected";

const packagesAt = (paths: string[]) =>
  paths.map((path) => ({
    name: path === "." ? "//" : `@allonfire/${path.split("/")[1]}`,
    path,
  }));

/** `turbo query affected --packages` listing the packages at these paths. */
const turboQuery = (...paths: string[]) =>
  stringifyJson({
    data: { affectedPackages: { items: packagesAt(paths) } },
  });

/** `turbo ls --output=json` of the whole workspace. */
const ALL = stringifyJson({
  packages: {
    items: packagesAt([
      "apps/api",
      "apps/back-office",
      "packages/auth",
      "packages/database",
    ]),
  },
});

const EVERY_UNIT = {
  apps: ["api", "back-office"],
  deploy: ["db-migrate", "api", "back-office"],
};

const SOURCE_CHANGE = ["apps/back-office/src/app/[locale]/page.tsx"];

describe("affectedFrom", () => {
  it("deploys only the App a change touched", () => {
    expect(
      affectedFrom(turboQuery("apps/back-office"), ALL, SOURCE_CHANGE)
    ).toEqual({ apps: ["back-office"], deploy: ["back-office"] });
  });

  it("deploys every App reading a shared package Turbo lists as affected", () => {
    expect(
      affectedFrom(
        turboQuery("packages/auth", "apps/api", "apps/back-office"),
        ALL,
        ["packages/auth/src/features/next/utils/session.ts"]
      )
    ).toEqual({ apps: ["api", "back-office"], deploy: ["api", "back-office"] });
  });

  it("adds the migration first when the database package changed", () => {
    expect(
      affectedFrom(turboQuery("packages/database", "apps/api"), ALL, [
        "packages/database/prisma/schema/auth.prisma",
      ])
    ).toEqual({ apps: ["api"], deploy: ["db-migrate", "api"] });
  });

  it("affects nothing when Turbo lists only the root", () => {
    expect(affectedFrom(turboQuery("."), ALL, ["CONTEXT.md"])).toEqual({
      apps: [],
      deploy: [],
    });
  });

  it.each([
    "docker/Dockerfile",
    "docker/docker-compose.prod.yml",
    ".dockerignore",
    "pnpm-workspace.yaml",
  ])("deploys every unit when %s changed, whatever Turbo lists", (file) => {
    expect(affectedFrom(turboQuery("."), ALL, [file])).toEqual(EVERY_UNIT);
  });

  it("rejects output that is not turbo query JSON", () => {
    expect(() =>
      affectedFrom("WARNING something", ALL, SOURCE_CHANGE)
    ).toThrow();
  });
});

describe("everything", () => {
  it("lists every App and every Deploy unit, the migration first", () => {
    expect(everything(ALL)).toEqual(EVERY_UNIT);
  });
});
