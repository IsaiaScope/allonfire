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
export const AOFBreadcrumbSeparator = BreadcrumbSeparator;

/** The trail reads at body size, 16px, in place of shadcn's 14px. */
export const AOFBreadcrumbList = ({
  className,
  ...props
}: ComponentProps<typeof BreadcrumbList>) => (
  <BreadcrumbList className={cn("text-base", className)} {...props} />
);
