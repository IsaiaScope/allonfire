// @module-tag unit
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { stringifyJson } from "../../../shared/utils/json";
import { writeDeclarations } from "../declarations";

let dir = "";

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "aof-declarations-"));
  // `vendor.ts` imports `strict.ts`; only the first is the project's file.
  await writeFile(
    join(dir, "vendor.ts"),
    'import { size } from "./strict";\nexport const twice = (n: number | null) => (n ?? size) * 2;\n'
  );
  await writeFile(join(dir, "strict.ts"), "export const size = 1;\n");
  await writeFile(
    join(dir, "tsconfig.json"),
    stringifyJson({
      compilerOptions: {
        module: "ESNext",
        moduleResolution: "bundler",
        noEmit: true,
        strict: true,
        types: [],
      },
      files: ["vendor.ts"],
    })
  );
});

afterEach(() => rm(dir, { force: true, recursive: true }));

describe("writeDeclarations", () => {
  it("writes the .d.ts of the project's own files beside them", async () => {
    expect(writeDeclarations(join(dir, "tsconfig.json"))).toEqual([
      join(dir, "vendor.d.ts"),
    ]);
    expect(await readFile(join(dir, "vendor.d.ts"), "utf8")).toContain(
      "export declare const twice: (n: number | null) => number;"
    );
  });

  it("writes nothing for the files they import", () => {
    writeDeclarations(join(dir, "tsconfig.json"));
    expect(existsSync(join(dir, "strict.d.ts"))).toBe(false);
  });
});
