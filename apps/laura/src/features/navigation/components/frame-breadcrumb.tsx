"use client";

import { AOFFrameBreadcrumb } from "@allonfire/ui/features/navigation/components/aof-frame-breadcrumb";
import { OceanArt } from "@/shared/components/ocean-art";
import { LAURA } from "@/shared/constants/laura";
import { crumbArt } from "../utils/crumb-art";

/** A crumb's picture, 28px: the App's favourite, then each Section's and page's own. */
const artMark = (_position: string, label?: string) => (
  <OceanArt art={crumbArt(label)} className="size-7" />
);

/**
 * The frame's breadcrumb, as the Back Office's (Laura, then the Section, Home
 * alone, the App's crumb hidden on a phone), each with a small picture
 * of Ocean's pool beside its name (and the Section's page, when it has one).
 * A client binding, as the Back Office's, since a Design's crumb mark is a
 * function a Server Component cannot hand a client one.
 */
export const FrameBreadcrumb = () => (
  <AOFFrameBreadcrumb app={LAURA} crumbMark={artMark} />
);
