import { Toaster } from "@allonfire/shadcn/components/sonner";
import type { ToasterProps } from "sonner";

/**
 * The page's edges (`--gutter-*`, ui's base.css), so a toast keeps clear of
 * a phone's corners, notch and home indicator. Sonner reads `mobileOffset`
 * below 600px and `offset` above, a phone in landscape included. At the
 * bottom, above a phone's tab bar while one shows (`--toast-bottom`). The
 * fallback holds where base.css is not loaded (a component test).
 */
const EDGES = {
  bottom: "var(--toast-bottom, var(--gutter-bottom, 1.5rem))",
  left: "var(--gutter-left, 1.5rem)",
  right: "var(--gutter-right, 1.5rem)",
  top: "var(--gutter-top, 1.5rem)",
} as const satisfies ToasterProps["offset"];

// shadcn's Sonner under an AOF name; an App mounts one AOFToaster in its
// layout and sends toasts with useAOFToast (`lib/use-aof-toast`) from a
// client component. Add behaviour here, never in packages/shadcn.
export const AOFToaster = (props: ToasterProps) => (
  <Toaster mobileOffset={EDGES} offset={EDGES} {...props} />
);
