"use client";

import { AOFFrameBreadcrumb } from "@allonfire/ui/features/navigation/components/aof-frame-breadcrumb";
import { LAURA } from "@/shared/constants/laura";

/**
 * The frame's breadcrumb: Laura, then the Section. A client binding, as the
 * Back Office's, since a Design's crumb mark would be a function a Server
 * Component cannot hand a client one; Ocean draws none.
 */
export const FrameBreadcrumb = () => <AOFFrameBreadcrumb app={LAURA} />;
