import { UNIT } from "@allonfire/core/shared/constants/units";
import type { ElementOf } from "@allonfire/core/shared/utils/object";
import {
  createElement,
  type PointerEvent,
  type ReactElement,
  useEffect,
  useRef,
} from "react";
import { type ExternalToast, toast } from "sonner";

export const AOF_TOAST = {
  /** A failure or a warning stays twice Sonner's 4 seconds: it is read,
   *  then acted on. Any toast also waits while hovered or focused (Sonner's
   *  own pause). */
  NEEDS_READING: { duration: 8 * UNIT.MS_PER_SECOND },
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

/** How a one-off notice went: each wears its colour and pictogram
 *  (`AOFToaster`). */
export const AOF_TOAST_KINDS = ["error", "info", "success", "warning"] as const;
export type AOFToastKind = ElementOf<typeof AOF_TOAST_KINDS>;

/** The kinds that stay longer: something went wrong, or may. */
const NEEDS_READING: ReadonlySet<AOFToastKind> = new Set(["error", "warning"]);

/** Sonner starts a swipe on any press inside a toast; stopped on the words,
 *  so they take the text caret and can be selected (and copied by hand),
 *  while the toast is still dragged away by its band and edges. */
const stopSwipe = (event: PointerEvent) => event.stopPropagation();

/** A notice's words, selectable. */
const words = (message: string) =>
  createElement(
    "span",
    { className: "cursor-text select-text", onPointerDown: stopSwipe },
    message
  );

/** Sonner's options for one notice, any of them; its `description`, more
 *  about it under the message (which then reads as its title), is words. */
export type AOFToastOptions = Omit<ExternalToast, "description"> & {
  description?: string | undefined;
};

/** A one-off notice, read once and gone: a success, a fact, a warning or a
 *  failure, with more about it under it when needed. The same words (and
 *  description) of the same kind sent again while it shows are one toast
 *  (its id), not a stack of copies; it keeps its first timer
 *  (Sonner restarts one only for a new duration). */
export const aofToast = (
  message: string,
  kind: AOFToastKind,
  { description, ...options }: AOFToastOptions = {}
) => {
  toast[kind](words(message), {
    id: [kind, message, description].filter(Boolean).join(":"),
    ...(NEEDS_READING.has(kind) ? AOF_TOAST.NEEDS_READING : undefined),
    ...(description ? { description: words(description) } : undefined),
    ...options,
  });
};
