import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@allonfire/shadcn/components/breadcrumb";
import type { ComponentProps } from "react";
import { cn } from "../../../shared/utils/utils";

// ponytail: shadcn's breadcrumb under AOF names; the signed-in frame's
// header is its one user. Add behaviour here, never in packages/shadcn.
export const AOFBreadcrumbLink = BreadcrumbLink;
export const AOFBreadcrumbPage = BreadcrumbPage;

/** It may shrink below its content, so a long trail is cut inside the header, not pushed out of it. */
export const AOFBreadcrumb = ({
  className,
  ...props
}: ComponentProps<typeof Breadcrumb>) => (
  <Breadcrumb className={cn("min-w-0", className)} {...props} />
);

/** A crumb may shrink: its text, held in a `truncate` span, is cut with an ellipsis. */
export const AOFBreadcrumbItem = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbItem>) => (
  <BreadcrumbItem className={cn("min-w-0", className)} {...props} />
);

/**
 * The trail reads at 18px, in place of shadcn's 14px, and stays on one line
 * (shadcn's wraps, which dropped the page under the header's rule).
 */
export const AOFBreadcrumbList = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbList>) => (
  <BreadcrumbList className={cn("flex-nowrap text-lg", className)} {...props} />
);

/** Its chevron at 16px, in step with the larger trail (shadcn's is 14px). */
export const AOFBreadcrumbSeparator = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbSeparator>) => (
  <BreadcrumbSeparator className={cn("[&>svg]:size-4", className)} {...props} />
);
