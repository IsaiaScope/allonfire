// @module-tag unit
import {
  buildChangeset,
  CHANGESET_NAME,
  isEmptySql,
  nextChangesetNumber,
} from "../changeset-file";

describe("isEmptySql", () => {
  it("is true for Prisma's empty diff", () => {
    expect(isEmptySql("-- This is an empty migration.\n")).toBe(true);
  });

  it("is true for blank output", () => {
    expect(isEmptySql("\n  \n")).toBe(true);
  });

  it("is false once a statement appears", () => {
    expect(isEmptySql("-- CreateTable\nCREATE TABLE x ();\n")).toBe(false);
  });
});

describe("nextChangesetNumber", () => {
  it("starts at 0000", () => {
    expect(nextChangesetNumber([])).toBe("0000");
  });

  it("follows the highest number", () => {
    expect(
      nextChangesetNumber(["0000-baseline.sql", "0001-auth-laura-schemas.sql"])
    ).toBe("0002");
  });

  it("follows the highest number across gaps", () => {
    expect(nextChangesetNumber(["0000-a.sql", "0007-b.sql"])).toBe("0008");
  });

  it("ignores files that are not changesets", () => {
    expect(
      nextChangesetNumber([
        ".DS_Store",
        "notes.md",
        "12-short.sql",
        "0003-x.sql",
      ])
    ).toBe("0004");
  });

  it("counts a hand-named changeset, so no two share a number", () => {
    expect(nextChangesetNumber(["0000-a.sql", "0002-Add_Index.sql"])).toBe(
      "0003"
    );
  });
});

describe("CHANGESET_NAME", () => {
  it("accepts kebab case", () => {
    expect(CHANGESET_NAME.test("add-photo-alt")).toBe(true);
  });

  it("rejects anything else", () => {
    for (const name of ["", "Add", "add_alt", "-add", "add-", "a b"]) {
      expect(CHANGESET_NAME.test(name)).toBe(false);
    }
  });
});

describe("buildChangeset", () => {
  it("writes a formatted SQL changeset with one rollback line per statement line", () => {
    expect(
      buildChangeset({
        forward:
          '-- AlterTable\nALTER TABLE "laura"."Photo" ADD COLUMN "alt" TEXT;\n',
        id: "0002-add-photo-alt",
        rollback:
          '-- AlterTable\nALTER TABLE "laura"."Photo" DROP COLUMN "alt";\n',
      })
    ).toBe(
      [
        "--liquibase formatted sql logicalFilePath:changesets/0002-add-photo-alt.sql",
        "",
        "--changeset isaia:0002-add-photo-alt",
        "-- AlterTable",
        'ALTER TABLE "laura"."Photo" ADD COLUMN "alt" TEXT;',
        '--rollback ALTER TABLE "laura"."Photo" DROP COLUMN "alt";',
        "",
      ].join("\n")
    );
  });

  it("keeps a multi-line rollback statement as consecutive rollback lines", () => {
    const changeset = buildChangeset({
      forward: 'CREATE TABLE "laura"."Tag" (\n  "id" TEXT NOT NULL\n);\n',
      id: "0003-add-tag",
      rollback: '-- DropTable\nDROP TABLE\n  "laura"."Tag";\n',
    });
    expect(changeset).toContain(
      '--rollback DROP TABLE\n--rollback   "laura"."Tag";'
    );
  });
});
