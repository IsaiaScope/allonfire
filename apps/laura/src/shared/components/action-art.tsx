import type { OceanMonoKey } from "@allonfire/design/designs/ocean/mascot-art";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { OceanArt, type OceanArtProps } from "./ocean-art";

export type ActionArtProps = Omit<OceanArtProps, "art"> & { art: OceanMonoKey };

/**
 * A one-colour picture faint inside a button (`relative isolate
 * overflow-hidden`, which `ACTION_DRESSING` gives), behind its label and cut
 * by its edges, in its label's colour: every variant tints its own. The
 * Back Office brushes a kanji there; Laura, a picture of the sea.
 */
export const ActionArt = ({ className, ...props }: ActionArtProps) => (
  <OceanArt
    className={cn(
      "pointer-events-none absolute top-1/2 right-2 -z-10 size-8 -translate-y-1/2 -rotate-12 text-current/20",
      className
    )}
    {...props}
  />
);
