import { OCEAN_FACE } from "@allonfire/design/designs/ocean/ocean-mark";
import {
  type AOFToastBackdrops,
  AOFToaster,
} from "@allonfire/ui/features/feedback/components/aof-toaster";
import type { ComponentProps } from "react";
import { OceanMark } from "./ocean-mark";

/** The octopus peeking in at a toast's end: its edges cut it, its height sizes it (a container). */
const peek = (face: (typeof OCEAN_FACE)[keyof typeof OCEAN_FACE]) => (
  <OceanMark
    className="absolute top-1/2 right-2 size-[110cqh] -translate-y-1/2 opacity-25"
    face={face}
    tone="white"
  />
);

/**
 * Each kind's face, as the tide pool shows how it went: happy done, a wink
 * for a notice, wide eyes for a caution, dizzy for a failure.
 */
const BACKDROPS = {
  error: peek(OCEAN_FACE.DIZZY),
  info: peek(OCEAN_FACE.WINK),
  success: peek(OCEAN_FACE.HAPPY),
  warning: peek(OCEAN_FACE.SURPRISED),
} as const satisfies AOFToastBackdrops;

/** ui's toaster in Ocean: the octopus behind every notice that says how something went. */
export const OceanToaster = (
  props: Omit<ComponentProps<typeof AOFToaster>, "backdrops">
) => <AOFToaster backdrops={BACKDROPS} {...props} />;
