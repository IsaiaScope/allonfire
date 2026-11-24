// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
import { objectValues } from "../../../shared/utils/object";
import { patchVendor, VENDOR_PATCHES } from "../vendor-patches";

/** What shadcn's CLI writes for `use-mobile`. */
const UPSTREAM_USE_MOBILE = `const MOBILE_BREAKPOINT = 768

export function useIsMobile() {
  const [isMobile, setIsMobile] = React.useState<boolean | undefined>(undefined)

  React.useEffect(() => {
    const mql = window.matchMedia(\`(max-width: \${MOBILE_BREAKPOINT - 1}px)\`)
    const onChange = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    }
    mql.addEventListener("change", onChange)
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)
    return () => mql.removeEventListener("change", onChange)
  }, [])

  return !!isMobile
}
`;

const { USE_MOBILE } = VENDOR_PATCHES;

describe("patchVendor", () => {
  it("makes shadcn's phone test read the breakpoint, never the lagging width", () => {
    const patched = patchVendor(USE_MOBILE, UPSTREAM_USE_MOBILE);
    expect(patched).not.toContain("window.innerWidth");
    expect(patched.match(/setIsMobile\(mql\.matches\)/g)).toHaveLength(2);
  });

  it("leaves a patched file as it is", () => {
    const patched = patchVendor(USE_MOBILE, UPSTREAM_USE_MOBILE);
    expect(patchVendor(USE_MOBILE, patched)).toBe(patched);
  });

  it("fails on a file the CLI wrote differently, so the patch is never lost unseen", () => {
    expect(() =>
      patchVendor(USE_MOBILE, "export const useIsMobile = 1")
    ).toThrow(USE_MOBILE.file);
  });

  it("finds every vendor file already patched", () => {
    for (const patch of objectValues(VENDOR_PATCHES)) {
      const path = resolve(REPO.ROOT, patch.file);
      const source = readFileSync(path, "utf8");
      expect(patchVendor(patch, source)).toBe(source);
    }
  });

  // Base UI keeps a popup 5px from the screen's edge; shadcn's wrappers give
  // an App no way to say more, so a menu can open under a notch.
  it("lets every popup's wrapper hand its Positioner a collisionPadding", () => {
    const files = [
      "dropdown-menu",
      "select",
      "popover",
      "tooltip",
      "combobox",
    ].map((name) =>
      readFileSync(
        resolve(REPO.ROOT, `packages/shadcn/src/components/${name}.tsx`),
        "utf8"
      )
    );
    for (const source of files) {
      expect(source).toContain('"collisionPadding"');
      expect(source).toContain("collisionPadding={collisionPadding}");
    }
  });

  // The CLI's popover, as it writes it: the three patches of one file must
  // compose, each reading what the last wrote.
  it("composes a file's patches, in any order, into a wrapper that forwards collisionPadding", () => {
    const upstream = `function PopoverContent({
  className,
  sideOffset = 4,
  ...props
}: PopoverPrimitive.Popup.Props &
  Pick<
    PopoverPrimitive.Positioner.Props,
    "align" | "sideOffset"
  >) {
  return (
    <PopoverPrimitive.Positioner
      sideOffset={sideOffset}
    />
  )
}`;
    const patches = objectValues(VENDOR_PATCHES).filter((patch) =>
      patch.file.endsWith("popover.tsx")
    );
    expect(patches).toHaveLength(3);
    const patched = patches.reduce(
      (text, patch) => patchVendor(patch, text),
      upstream
    );
    expect(patched).toContain("  collisionPadding,\n  ...props");
    expect(patched).toContain('"collisionPadding" | "align"');
    expect(patched).toContain("collisionPadding={collisionPadding}");
    expect(
      patches.reduce((text, patch) => patchVendor(patch, text), patched)
    ).toBe(patched);
  });
});
