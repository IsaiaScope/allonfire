import type { ComponentProps } from "react";
import { cn } from "../../../shared/utils/utils";

/**
 * The page's top bar, beside the sidebar: `--frame-bar-height` (`AOFSidebarProvider`) below a
 * notch above, its ends 16px in and clear of a notch on either side (on the
 * left only when no sidebar stands beside it, `--frame-inset-left`). Its
 * colour and line run under the notch.
 */
export const AOFFrameHeader = ({
  className,
  ...props
}: ComponentProps<"header">) => (
  <header
    className={cn(
      "relative isolate flex h-[calc(var(--frame-bar-height)+env(safe-area-inset-top,0px))] shrink-0 items-center gap-2 pt-[env(safe-area-inset-top,0px)] pr-[calc(--spacing(4)+env(safe-area-inset-right,0px))] pl-[calc(--spacing(4)+var(--frame-inset-left))]",
      className
    )}
    {...props}
  />
);
