import {
  type AOFToastBackdrops,
  AOFToaster,
} from "@allonfire/ui/features/feedback/components/aof-toaster";
import type { ComponentProps } from "react";
import { MASCOT } from "@/shared/constants/mascots";
import { OceanArt, type OceanArtProps } from "./ocean-art";

/** The picture peeking in at a toast's end: its edges cut it, its height sizes it (a container). */
const peek = (art: OceanArtProps["art"]) => (
  <OceanArt
    art={art}
    className="absolute top-1/2 right-2 size-[110cqh] -translate-y-1/2 opacity-25"
  />
);

/**
 * Each kind's picture (`MASCOT.TOAST`), as the tide pool shows how it went: the
 * Firefox octopus done, the classic one for a notice, the squid for a caution,
 * the Noto octopus for a failure.
 */
const BACKDROPS = {
  error: peek(MASCOT.TOAST.ERROR),
  info: peek(MASCOT.TOAST.INFO),
  success: peek(MASCOT.TOAST.SUCCESS),
  warning: peek(MASCOT.TOAST.WARNING),
} as const satisfies AOFToastBackdrops;

/** ui's toaster in Ocean: the octopus behind every notice that says how something went. */
export const OceanToaster = (
  props: Omit<ComponentProps<typeof AOFToaster>, "backdrops">
) => <AOFToaster backdrops={BACKDROPS} {...props} />;
