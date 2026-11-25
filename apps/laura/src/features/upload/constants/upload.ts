import { App } from "@allonfire/database/enums";

/** What the upload form is told. */
export const UPLOAD = {
  /** Every image goes to Laura: the form has no Apps to choose, and none has an Access either (always private). */
  APPS: { apps: [App.LAURA], kind: "fixed" },
} as const;
