"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Field } from "@base-ui/react/field";
import type * as React from "react";

function Label({
  className,
  ...props
}: React.ComponentProps<typeof Field.Label>) {
  return (
    <Field.Label
      className={cn(
        "flex select-none items-center gap-2 font-medium text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-50 group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50",
        className
      )}
      data-slot="label"
      {...props}
    />
  );
}

export { Label };
