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

const COMPONENTS = "packages/shadcn/src/components";

const COLLISION_REASON =
  "Base UI keeps a popup 5px from the screen's edge, so a menu can open under a notch or the home indicator; the wrapper must let an App pass `collisionPadding`.";

/** The three edits that let a popup's wrapper hand its Positioner a `collisionPadding`: its prop type, its destructuring, the Positioner. */
const collisionPadding = (name: string, primitive: string) => {
  const file = `${COMPONENTS}/${name}.tsx`;
  const reason = COLLISION_REASON;
  const pick = `  Pick<\n    ${primitive}.Positioner.Props,\n    `;
  const popup = `  ...props\n}: ${primitive}.Popup.Props &`;
  const positioner = `<${primitive}.Positioner\n`;
  return {
    [`${name}:destructure`]: {
      file,
      from: popup,
      reason,
      to: `  collisionPadding,\n${popup}`,
    },
    [`${name}:positioner`]: {
      file,
      from: positioner,
      reason,
      to: `${positioner}        collisionPadding={collisionPadding}\n`,
    },
    [`${name}:type`]: {
      file,
      from: pick,
      reason,
      to: `${pick}"collisionPadding" | `,
    },
  } satisfies Record<string, VendorPatch>;
};

const SIDEBAR_REASON =
  "`svh` is the height with Safari's toolbar up, so a frame sized by it leaves a band of ground once the toolbar hides; `dvh` follows the visible height.";

export const VENDOR_PATCHES = {
  SIDEBAR_CONTAINER_HEIGHT: {
    file: `${COMPONENTS}/sidebar.tsx`,
    from: "hidden h-svh w-(--sidebar-width)",
    reason: SIDEBAR_REASON,
    to: "hidden h-dvh w-(--sidebar-width)",
  },
  SIDEBAR_WRAPPER_HEIGHT: {
    file: `${COMPONENTS}/sidebar.tsx`,
    from: "flex min-h-svh w-full",
    reason: SIDEBAR_REASON,
    to: "flex min-h-dvh w-full",
  },
  ...collisionPadding("combobox", "ComboboxPrimitive"),
  ...collisionPadding("dropdown-menu", "MenuPrimitive"),
  ...collisionPadding("popover", "PopoverPrimitive"),
  ...collisionPadding("select", "SelectPrimitive"),
  ...collisionPadding("tooltip", "TooltipPrimitive"),
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
  // Already patched comes first: a patch that adds to a line keeps `from` in `to`.
  if (source.includes(patch.to)) {
    return source;
  }
  if (source.includes(patch.from)) {
    return source.replaceAll(patch.from, patch.to);
  }
  throw new Error(
    `vendor:patch: ${patch.file} no longer holds "${patch.from}"; check the patch (${patch.reason})`
  );
};
