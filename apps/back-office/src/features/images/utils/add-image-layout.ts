import { cva } from "class-variance-authority";

/**
 * The Add form's shared set, the form's and its skeleton's alike: Access on
 * the left with Apply to all at its bottom, in the room that column leaves beside
 * the Apps (which span both rows); one column on a phone, Apply last.
 */
export const sharedSet = cva("", {
  variants: {
    part: {
      apply: "@2xl:col-start-1 @2xl:row-start-2 self-end justify-self-start",
      apps: "@2xl:col-start-2 @2xl:row-span-2 @2xl:row-start-1",
      grid: "grid @2xl:grid-cols-2 grid-cols-1 @2xl:grid-rows-[auto_1fr] gap-x-6 gap-y-5",
    },
  },
});
