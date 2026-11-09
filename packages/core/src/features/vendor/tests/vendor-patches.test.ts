// @module-tag unit
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { REPO } from "@allonfire/config/local/repo";
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
    for (const patch of [USE_MOBILE]) {
      const path = resolve(REPO.ROOT, patch.file);
      const source = readFileSync(path, "utf8");
      expect(patchVendor(patch, source)).toBe(source);
    }
  });
});
