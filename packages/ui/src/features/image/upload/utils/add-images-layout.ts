import type { ImageAccess } from "@allonfire/database/enums";
import { cva } from "class-variance-authority";
import type { AOFAddImagesApps } from "../types/add-images-dressing";

/**
 * Whether the form has anything to choose besides the alt: the access, unless
 * every Image has one (`access` set), and the Apps, unless they are fixed.
 * With nothing to choose there is no shared set and a row is its alt alone.
 */
export const hasImageChoices = (
  access: ImageAccess | undefined,
  apps: AOFAddImagesApps
) => access === undefined || apps.kind === "options";

/**
 * The Add Images form's shared set, the form's and its skeleton's alike: Access on
 * the left with Apply to all at its bottom, in the room that column leaves beside
 * the Apps (which span both rows); one column on a phone, Apply last.
 */
export const addImagesLayout = cva("", {
  variants: {
    part: {
      apply: "@2xl:col-start-1 @2xl:row-start-2 self-end justify-self-start",
      apps: "@2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1",
      grid: "grid @2xl:grid-cols-2 grid-cols-1 @2xl:grid-rows-[auto_1fr] gap-x-6 gap-y-5",
    },
  },
});
