import { App } from "@allonfire/database/enums";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import type { AppDescriptor } from "@allonfire/ui/features/navigation/types/app-descriptor";
import {
  SECTIONS,
  type Section,
} from "@/features/navigation/constants/sections";
import { APP_ENTRY } from "./apps";
import { BACK_OFFICE_BASE } from "./back-office-base";

/**
 * What the Back Office says about itself: the descriptor the shared frame,
 * switcher and head read (`app`, `name`, `sections`, `entries`, `logo`,
 * `line`, `shareImageAlt`), and its own extras (`CHOSEN`, `PAGE`).
 */
export const BACK_OFFICE = {
  app: App.BACK_OFFICE,
  /** A chosen option (a Role): the line's deeper green, labelled in white. */
  CHOSEN: {
    INK: JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP_FOREGROUND,
    PILL: JAPAN_IMAGE_COLOR.LINE.GREEN_DEEP,
  },
  entries: APP_ENTRY,
  /** The Back Office's line in the Japan Design (the Line Rule). */
  line: JAPAN_IMAGE_COLOR.LINE.GREEN,
  logo: BACK_OFFICE_BASE.LOGO,
  name: BACK_OFFICE_BASE.NAME,
  PAGE: BACK_OFFICE_BASE.PAGE,
  sections: SECTIONS,
  /** The link-preview image's alt, the same in every language: two names. */
  shareImageAlt: `${BACK_OFFICE_BASE.NAME}, ${BRAND.NAME}`,
} as const satisfies AppDescriptor<Section> & Record<string, unknown>;
