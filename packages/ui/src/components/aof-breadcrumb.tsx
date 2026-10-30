import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@allonfire/shadcn/components/breadcrumb";
import type { ComponentProps } from "react";
import { cn } from "../lib/utils";

// ponytail: shadcn's breadcrumb under AOF names; the signed-in frame's
// header is its one user. Add behaviour here, never in packages/shadcn.
export const AOFBreadcrumb = Breadcrumb;
export const AOFBreadcrumbItem = BreadcrumbItem;
export const AOFBreadcrumbLink = BreadcrumbLink;
export const AOFBreadcrumbPage = BreadcrumbPage;

/** The trail reads at 18px, in place of shadcn's 14px. */
export const AOFBreadcrumbList = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbList>) => (
  <BreadcrumbList className={cn("text-lg", className)} {...props} />
);

/** Its chevron at 16px, in step with the larger trail (shadcn's is 14px). */
export const AOFBreadcrumbSeparator = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbSeparator>) => (
  <BreadcrumbSeparator className={cn("[&>svg]:size-4", className)} {...props} />
);
