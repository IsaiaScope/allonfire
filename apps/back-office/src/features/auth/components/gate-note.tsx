import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconAlertTriangle,
  IconCircleCheck,
  IconMailForward,
} from "@tabler/icons-react";
import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";

const gateNote = cva(
  "motion-safe:fade-in flex items-start gap-2 rounded-md border px-3 py-2 text-sm motion-safe:animate-in motion-safe:duration-300",
  {
    defaultVariants: { tone: "info" },
    variants: {
      tone: {
        info: "border-primary bg-primary/10",
        success: "border-primary bg-primary/10",
        warning: "border-destructive bg-destructive/10",
      },
    },
  }
);

const ICON = {
  info: (
    <IconMailForward
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-primary"
    />
  ),
  success: (
    <IconCircleCheck
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-primary"
    />
  ),
  warning: (
    <IconAlertTriangle
      aria-hidden
      className="mt-0.5 size-4 shrink-0 text-destructive"
    />
  ),
} as const;

/**
 * A line the ticket gate tells the visitor in its card, not a field's
 * error: a link sent, an email verified, a link that no longer works.
 * A live region, so it is announced when it appears.
 */
export const GateNote = ({
  children,
  className,
  tone = "info",
  ...props
}: ComponentProps<"p"> & VariantProps<typeof gateNote>) => (
  <p className={cn(gateNote({ tone }), className)} role="status" {...props}>
    {ICON[tone ?? "info"]}
    <span>{children}</span>
  </p>
);
