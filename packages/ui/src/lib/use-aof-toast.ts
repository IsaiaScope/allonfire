import { type ReactElement, useEffect, useRef } from "react";
import { type ExternalToast, toast } from "sonner";

export const AOF_TOAST = {
  /** A toast that stays until its sender takes it back: no timeout, no swipe. */
  PERSISTENT: { dismissible: false, duration: Number.POSITIVE_INFINITY },
} as const satisfies Record<string, Omit<ExternalToast, "id">>;

/**
 * Shows `content` as the toast `id` while it is not null, updated in place
 * on every render, and dismisses it once null or unmounted. Sent a frame
 * late: Sonner's toaster starts listening in an effect, so on a page still
 * hydrating a toast sent sooner is lost. Dismisses only a toast it sent:
 * Sonner applies a dismissal a frame later, and one for a toast not yet
 * sent would land after it and remove it.
 */
export const useAOFToast = (
  id: string,
  content: ReactElement | null,
  options: Omit<ExternalToast, "id">
) => {
  const sent = useRef<boolean>(false);
  useEffect(() => {
    if (content === null) {
      if (sent.current) {
        toast.dismiss(id);
        sent.current = false;
      }
      return;
    }
    const frame = requestAnimationFrame(() => {
      sent.current = true;
      // Sonner sizes an expanded (hovered) toast by the height it measured
      // when the toast appeared; content updated in place, a font loading
      // or a new width changes it, and the toast would jump on hover. A
      // custom toast also shrinks to its content at the toaster's left edge
      // on a wide screen: spanning the toaster lets narrower content centre
      // itself, as Sonner's own phone layout already does.
      toast.custom(() => content, {
        ...options,
        id,
        style: { height: "auto", left: 0, right: 0, ...options.style },
      });
    });
    return () => cancelAnimationFrame(frame);
  });
  useEffect(
    () => () => {
      if (sent.current) {
        toast.dismiss(id);
      }
    },
    [id]
  );
};
