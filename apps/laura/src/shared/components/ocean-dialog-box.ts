import { cva } from "class-variance-authority";

/**
 * The box of an Ocean dialog or alert: its corners, and a width between the
 * page's gutters, up to 28rem, never under 18rem. The `data-[size=default]`
 * spellings beat the alert's own `sm:max-w-md`; the plain one is the
 * dialog's.
 */
export const oceanDialogBox = cva(
  "min-w-72 overflow-hidden rounded-xl data-[size=default]:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),28rem)] sm:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),28rem)] data-[size=default]:sm:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),28rem)]"
);
