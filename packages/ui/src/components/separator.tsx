"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Separator as SeparatorPrimitive } from "@base-ui/react/separator";
import type * as React from "react";

function Separator({
  className,
  orientation = "horizontal",
  ...props
}: React.ComponentProps<typeof SeparatorPrimitive> & {
  decorative?: boolean;
}) {
  return (
    <SeparatorPrimitive
      className={cn(
        "shrink-0 bg-border data-[orientation=horizontal]:h-px data-[orientation=vertical]:h-full data-[orientation=horizontal]:w-full data-[orientation=vertical]:w-px",
        className
      )}
      data-slot="separator"
      orientation={orientation}
      {...props}
    />
  );
}

export { Separator };
