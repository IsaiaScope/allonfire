import {
  buttonVariants,
  Button as ShadcnButton,
} from "@allonfire/shadcn/components/button";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

type ShadcnButtonProps = ComponentProps<typeof ShadcnButton>;

/** shadcn's sizes, plus `field`: a form field's height (`AOFTextField`), and
 *  `icon-field`: an icon button that square. */
export type AOFButtonSize =
  | NonNullable<ShadcnButtonProps["size"]>
  | "field"
  | "icon-field";

export type AOFButtonProps = Omit<ShadcnButtonProps, "size"> & {
  size?: AOFButtonSize;
};

// The size shadcn has no name for: as tall as an AOF field
// (`--field-height`: 40px under a mouse, 44px on touch), so a form's buttons
// line up with its inputs, a notice's action and Sign in's alike.
const aofSize = cva("", {
  variants: {
    size: {
      field:
        "h-(--field-height) gap-2 px-5 text-base [&_svg:not([class*='size-'])]:size-5",
      "icon-field": "size-(--field-height)",
    },
  },
});

/** The size shadcn draws, and the classes an AOF size adds on top of it. */
const sized = (size: AOFButtonSize | undefined) => {
  if (size === "field") {
    return { extra: aofSize({ size }), size: "default" as const };
  }
  if (size === "icon-field") {
    return { extra: aofSize({ size }), size: "icon-sm" as const };
  }
  return { extra: "", size };
};

// The shadcn Button plus a pointer cursor, which shadcn v4 leaves out, and
// the field sizes. It exists so Apps import from @allonfire/ui (ADR 0010);
// customisations land here, not in packages/shadcn.
export const AOFButton = ({ className, size, ...props }: AOFButtonProps) => {
  const shadcn = sized(size);
  return (
    <ShadcnButton
      className={cn("cursor-pointer", shadcn.extra, className)}
      size={shadcn.size}
      {...props}
    />
  );
};

type AOFButtonVariantsOptions = {
  size?: AOFButtonSize;
  variant?: ShadcnButtonProps["variant"];
};

/**
 * The button's classes for an element that is not a button: a link that
 * navigates (the i18n `Link`) and should look like one. A Server Component
 * cannot pass Base UI's `render` prop, so the link takes the classes instead.
 */
export const aofButtonVariants = ({
  size,
  variant,
}: AOFButtonVariantsOptions = {}) => {
  const shadcn = sized(size);
  return cn(
    "cursor-pointer",
    buttonVariants({ size: shadcn.size, variant }),
    shadcn.extra
  );
};
