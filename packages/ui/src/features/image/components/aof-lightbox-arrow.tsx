"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback } from "react";
import { useController, useNavigationState } from "yet-another-react-lightbox";
import { cn } from "../../../shared/utils/utils";
import {
  AOFControlBar,
  type AOFControlBarProps,
} from "../../data-table/components/aof-control-bar";
import { AOFLightboxButton } from "./aof-lightbox-button";

const ARROW = {
  // Each arrow's tip opens towards the picture.
  next: {
    className: "right-(--gutter-right)",
    Icon: IconChevronRight,
    tip: { side: "left" },
  },
  prev: {
    className: "left-(--gutter-left)",
    Icon: IconChevronLeft,
    tip: { side: "right" },
  },
} as const;

export type AOFLightboxArrowProps = Omit<AOFControlBarProps, "children"> & {
  direction: keyof typeof ARROW;
  /** The arrow's name, and its tip. */
  label: string;
};

/**
 * Previous or next in a capsule at the preview's edge, from a tablet up: on a
 * phone the swipe does it. Disabled at the ends, where the carousel stops. It
 * draws inside `yet-another-react-lightbox`, which it asks to step.
 */
export const AOFLightboxArrow = ({
  className,
  direction,
  label,
  ...props
}: AOFLightboxArrowProps) => {
  const { next, prev } = useController();
  const { nextDisabled, prevDisabled } = useNavigationState();
  const { Icon, className: edge, tip } = ARROW[direction];
  const disabled = direction === "next" ? nextDisabled : prevDisabled;
  const step = useCallback(() => {
    if (direction === "next") {
      next();
    } else {
      prev();
    }
  }, [direction, next, prev]);
  return (
    <AOFControlBar
      className={cn(
        "absolute top-1/2 hidden -translate-y-1/2 sm:flex",
        edge,
        className
      )}
      {...props}
    >
      <AOFLightboxButton
        disabled={disabled}
        label={label}
        onClick={step}
        tooltipProps={tip}
      >
        <Icon aria-hidden />
      </AOFLightboxButton>
    </AOFControlBar>
  );
};
