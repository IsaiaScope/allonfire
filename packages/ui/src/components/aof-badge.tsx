import { Badge } from "@allonfire/shadcn/components/badge";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

/**
 * shadcn's badge, a short label on a chip (a Role, a status). Its corner
 * comes from the Design's radius (`rounded-sm`), not shadcn's pill.
 */
export const AOFBadge = ({
  className,
  ...props
}: ComponentProps<typeof Badge>) => (
  <Badge className={cn("rounded-sm", className)} {...props} />
);
