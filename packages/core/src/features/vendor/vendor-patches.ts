/**
 * A fix the App needs in a file a vendor's CLI writes (`packages/shadcn`),
 * which nobody edits by hand: `vendor:patch` rewrites `from` to `to` after
 * every `shadcn add` (the shadcn `canonicalize` script runs it).
 */
export type VendorPatch = {
  /** The file, from the repo's root. */
  file: string;
  from: string;
  /** Why the vendor's code is wrong for the App. */
  reason: string;
  to: string;
};

export const VENDOR_PATCHES = {
  USE_MOBILE: {
    file: "packages/shadcn/src/hooks/use-mobile.ts",
    from: "setIsMobile(window.innerWidth < MOBILE_BREAKPOINT)",
    reason:
      "iOS fires the breakpoint's change mid-turn, while innerWidth still holds the old width: the sidebar stayed a phone drawer on a phone turned sideways. The query's own answer is the one CSS's md: uses.",
    to: "setIsMobile(mql.matches)",
  },
} as const satisfies Record<string, VendorPatch>;

/**
 * `source` with `patch` applied; as it is once patched. Neither the vendor's
 * code nor the patched code in it: the vendor changed the file, and the
 * patch needs a new look, so it throws rather than drop the fix unseen.
 */
export const patchVendor = (patch: VendorPatch, source: string) => {
  if (source.includes(patch.from)) {
    return source.replaceAll(patch.from, patch.to);
  }
  if (source.includes(patch.to)) {
    return source;
  }
  throw new Error(
    `vendor:patch: ${patch.file} no longer holds "${patch.from}"; check the patch (${patch.reason})`
  );
};
