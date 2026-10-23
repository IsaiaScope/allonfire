"use client";

import { IconAlertTriangle } from "@tabler/icons-react";
import { type ReactNode, useCallback } from "react";
import { AOFButton } from "./aof-button";
import { AOFEmpty, type AOFEmptyProps } from "./aof-empty";

export type AOFDataTableErrorProps = Omit<
  AOFEmptyProps,
  "children" | "icon"
> & {
  /** A pictogram; a warning sign by default. */
  icon?: ReactNode;
  onRetry: () => void;
  /** The retry button's text. */
  retry: string;
};

/** The rows could not be loaded: what failed, and a button to ask again. */
export const AOFDataTableError = ({
  icon = <IconAlertTriangle />,
  onRetry,
  retry,
  ...props
}: AOFDataTableErrorProps) => {
  // A bare `onRetry` would receive the click event as its first argument.
  const again = useCallback(() => onRetry(), [onRetry]);
  return (
    <AOFEmpty icon={icon} {...props}>
      <AOFButton onClick={again} variant="outline">
        {retry}
      </AOFButton>
    </AOFEmpty>
  );
};
