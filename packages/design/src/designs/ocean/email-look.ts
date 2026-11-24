import { OCEAN_IMAGE_COLOR } from "./image-colors";

const { dark, light } = OCEAN_IMAGE_COLOR;

/**
 * What the Ocean Design adds to `AOFEmail` (`@allonfire/ui`): its colours,
 * day and night, and white on the primary for the button. No flourish: the
 * octopus has no web font to carry and a mail client has no page to hang it
 * on, so the email stays plain, in the Design's colours. The design package
 * cannot import ui, so the type is the colour part of `AOFEmailLook`, which
 * the API's `satisfies` checks.
 */
export const OCEAN_EMAIL_LOOK = {
  accent: light.primary,
  accentInk: "#ffffff",
  dark: {
    card: dark.card,
    ground: dark.background,
    ink: dark.foreground,
    muted: dark.mutedForeground,
  },
  ground: light.background,
  ink: light.foreground,
  muted: light.mutedForeground,
} as const;
