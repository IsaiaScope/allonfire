"use client";

import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { useCallback } from "react";
import { useController, useNavigationState } from "yet-another-react-lightbox";
import { AOFButton } from "../../../shared/components/aof-button";
import { AOFTooltip } from "../../../shared/components/aof-tooltip";
import { cn } from "../../../shared/utils/utils";
import {
  AOFControlBar,
  type AOFControlBarProps,
} from "../../data-table/components/aof-control-bar";

const ARROW = {
  next: {
    className: "right-(--gutter-right)",
    Icon: IconChevronRight,
    side: "left",
  },
  prev: {
    className: "left-(--gutter-left)",
    Icon: IconChevronLeft,
    side: "right",
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
  const { Icon, className: edge, side } = ARROW[direction];
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
      <AOFTooltip contentProps={{ side }} label={label}>
        <AOFButton
          aria-label={label}
          disabled={disabled}
          onClick={step}
          size="icon"
          variant="ghost"
        >
          <Icon aria-hidden className="size-6" />
        </AOFButton>
      </AOFTooltip>
    </AOFControlBar>
  );
};
