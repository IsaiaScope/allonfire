import { svgDataUrl } from "@allonfire/core/shared/utils/svg-data-url";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import {
  OCEAN_MARK,
  type OceanFace,
  oceanMarkSvg,
} from "@allonfire/design/designs/ocean/ocean-mark";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";

const { dark, INK, light } = OCEAN_IMAGE_COLOR;

/**
 * The octopus's colours per tone, one picture per scheme where the ground
 * changes (the theme toggle's `.dark` shows the one in force), a single one
 * where it does not. A picture cannot read CSS variables, so each carries
 * the Design's own values.
 */
const TONE = {
  coral: [
    { body: light.coral, ink: INK, scheme: "light" },
    { body: dark.coral, ink: INK, scheme: "dark" },
  ],
  teal: [
    { body: light.primary, ink: light.card, scheme: "light" },
    { body: dark.primary, ink: INK, scheme: "dark" },
  ],
  white: [{ body: light.card, ink: INK, scheme: "always" }],
} as const;

const picture = cva("size-full", {
  variants: {
    scheme: { always: "", dark: "hidden dark:block", light: "dark:hidden" },
  },
});

export type OceanMarkProps = ComponentPropsWithoutChildren<"span"> & {
  face: OceanFace;
  tone: keyof typeof TONE;
};

/**
 * Laura's octopus with the face of a moment, as pictures painted with the
 * HTML (data URLs: no request of their own). Decoration: the words around
 * it say what it shows. Size it with `className`.
 */
export const OceanMark = ({
  className,
  face,
  tone,
  ...props
}: OceanMarkProps) => (
  <span
    aria-hidden
    className={cn("inline-flex shrink-0", className)}
    {...props}
  >
    {TONE[tone].map(({ body, ink, scheme }) => (
      <AOFImage
        alt=""
        className={picture({ scheme })}
        height={OCEAN_MARK.EDGE}
        key={scheme}
        sizes={`${OCEAN_MARK.EDGE}px`}
        src={svgDataUrl(oceanMarkSvg({ body, face, ink }))}
        width={OCEAN_MARK.EDGE}
      />
    ))}
  </span>
);
