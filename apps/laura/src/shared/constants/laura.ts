import { App } from "@allonfire/database/enums";
import { APP } from "@allonfire/design/apps/app";
import { LAURA_LOGO } from "@allonfire/design/apps/laura/laura-logo";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import type { AppDescriptor } from "@allonfire/ui/features/navigation/types/app-descriptor";
import { SECTION } from "@/features/navigation/constants/sections";
import pkg from "../../../package.json" with { type: "json" };
import { LAURA_BASE } from "./laura-base";

/**
 * What Laura says about itself: the descriptor the shared frame, switcher and
 * head read (`app`, `name`, `sections`, `entries`, `logo`, `line`,
 * `shareImageAlt`, `version`), and its own extras (`CHOSEN`, `PAGE`).
 */
export const LAURA = {
  app: App.LAURA,
  /** A chosen option (Access): the octopus's own dark, labelled in the night's pale text. */
  CHOSEN: {
    INK: OCEAN_IMAGE_COLOR.dark.foreground,
    PILL: OCEAN_IMAGE_COLOR.INK,
  },
  /** How Laura draws each App in its switcher: the one definition the Back Office reads too. */
  entries: APP.ENTRY,
  /** Laura's line in the Ocean Design (the share card's top band). */
  line: OCEAN_IMAGE_COLOR.light.coral,
  logo: LAURA_LOGO,
  name: LAURA_LOGO.name,
  PAGE: LAURA_BASE.PAGE,
  sections: SECTION.LIST,
  /** The link-preview image's alt, the same in every language: two names. */
  shareImageAlt: `${LAURA_LOGO.name}, ${BRAND.NAME}`,
  /** Laura's own release, from its own `package.json`: a Release moves it. */
  version: pkg.version,
} as const satisfies AppDescriptor & Record<string, unknown>;
