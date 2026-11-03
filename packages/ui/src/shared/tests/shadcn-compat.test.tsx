// @module-tag unit
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
// Type-checked by `pnpm check-types` under this package's strict tsconfig:
// these are the generated components that break the repo's strict flags, so
// one whose generated .d.ts goes missing or stale fails here, not on the
// first AOF date picker.

import { existsSync, readdirSync } from "node:fs";
import { Calendar } from "@allonfire/shadcn/components/calendar";
import { Faceted, FacetedTrigger } from "@allonfire/shadcn/components/faceted";
import { ScrollArea } from "@allonfire/shadcn/components/scroll-area";
import { Toaster } from "@allonfire/shadcn/components/sonner";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

describe("shadcn components under a consumer's tsconfig", () => {
  it("renders the calendar, the faceted filter, the scroll area and the toaster", () => {
    const html = renderToStaticMarkup(
      <>
        <Calendar />
        <Faceted>
          <FacetedTrigger>filter</FacetedTrigger>
        </Faceted>
        <ScrollArea>content</ScrollArea>
        <Toaster />
      </>
    );
    expect(html).toContain('data-slot="calendar"');
    expect(html).toContain('data-slot="faceted-trigger"');
    expect(html).toContain('data-slot="scroll-area"');
    // Sonner draws no toaster until a toast shows: only its live region.
    expect(html).toContain('<section aria-label="Notifications');
  });
});

// packages/shadcn's components, and the tsconfigs that check them: the
// package's strict one and the lenient ones beside the vendor files that are
// not strict TypeScript.
const SHADCN = `${resolve(REPO.PACKAGES, "shadcn")}/`;
const COMPONENTS = `${SHADCN}src/components/`;
const TSX = /\.tsx$/;
/** macOS's `._` sidecars on the exFAT drive (CLAUDE.md): not components. */
const isComponent = (file: string) => TSX.test(file) && !file.startsWith("._");
/** A tsconfig beside the components: a lenient one. */
const TSCONFIG = /^tsconfig(\.[\w-]+)?\.json$/;

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

describe("packages/shadcn's tsconfigs", () => {
  const strict = checkedBy(`${SHADCN}tsconfig.json`);
  const lenients = readdirSync(COMPONENTS)
    .filter((file) => TSCONFIG.test(file))
    .map((file) => checkedBy(`${COMPONENTS}${file}`));
  const lenient = lenients.flat();

  it("check every component exactly once", () => {
    const components = readdirSync(COMPONENTS).filter(isComponent).sort();
    expect(lenients.length).toBeGreaterThan(1);
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
