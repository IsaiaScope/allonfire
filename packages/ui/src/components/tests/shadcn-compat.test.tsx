// @module-tag unit
// Type-checked by `pnpm check-types` under this package's tsconfig: these are
// the generated components that break the repo's strict flags, so a consumer
// that stops relaxing them fails here, not on the first AOF date picker.

import { existsSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { Calendar } from "@allonfire/shadcn/components/calendar";
import { ScrollArea } from "@allonfire/shadcn/components/scroll-area";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

describe("shadcn components under a consumer's tsconfig", () => {
  it("renders the calendar and the scroll area", () => {
    const html = renderToStaticMarkup(
      <>
        <Calendar />
        <ScrollArea>content</ScrollArea>
      </>
    );
    expect(html).toContain('data-slot="calendar"');
    expect(html).toContain('data-slot="scroll-area"');
  });
});

// packages/shadcn's components, and the two tsconfigs that check them: the
// package's strict one and the lenient one beside the vendor files that are
// not strict TypeScript.
const SHADCN = fileURLToPath(new URL("../../../../shadcn/", import.meta.url));
const COMPONENTS = `${SHADCN}src/components/`;
const TSX = /\.tsx$/;
/** macOS's `._` sidecars on the exFAT drive (CLAUDE.md): not components. */
const isComponent = (file: string) => TSX.test(file) && !file.startsWith("._");

/** The component files a tsconfig checks. */
const checkedBy = (config: string) => {
  const { config: json } = ts.readConfigFile(config, ts.sys.readFile);
  return ts
    .parseJsonConfigFileContent(
      json,
      ts.sys,
      config.slice(0, config.lastIndexOf("/"))
    )
    .fileNames.filter((file) => file.startsWith(COMPONENTS))
    .map((file) => file.slice(COMPONENTS.length))
    .filter(isComponent);
};

describe("packages/shadcn's two tsconfigs", () => {
  const strict = checkedBy(`${SHADCN}tsconfig.json`);
  const lenient = checkedBy(`${COMPONENTS}tsconfig.json`);

  it("check every component exactly once", () => {
    const components = readdirSync(COMPONENTS).filter(isComponent).sort();
    expect(strict.filter((file) => lenient.includes(file))).toEqual([]);
    expect([...strict, ...lenient].sort()).toEqual(components);
  });

  it("give every lenient component its generated declaration", () => {
    expect(
      lenient.filter(
        (file) => !existsSync(`${COMPONENTS}${file.replace(TSX, ".d.ts")}`)
      )
    ).toEqual([]);
  });
});
