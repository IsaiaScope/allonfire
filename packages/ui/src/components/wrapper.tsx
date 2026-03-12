import { cn } from "@allonfire/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type * as React from "react";

const wrapperVariants = cva("", {
  variants: {
    variant: {
      default: "",
      fullscreen: "absolute top-0 right-0 bottom-0 left-0",
      app: "flex min-h-dvh flex-col",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

function Wrapper({
  children,
  className,
  variant,
  tag,
  ...props
}: {
  children: React.ReactNode;
  className?: string;
  tag:
    | "main"
    | "section"
    | "article"
    | "aside"
    | "nav"
    | "header"
    | "footer"
    | "div";
} & VariantProps<typeof wrapperVariants> &
  React.HTMLAttributes<HTMLElement>) {
  const Comp = tag;
  return (
    <Comp
      className={cn(wrapperVariants({ variant, className }))}
      data-slot="wrapper"
      {...props}
    >
      {children}
    </Comp>
  );
}

export { Wrapper, wrapperVariants };
