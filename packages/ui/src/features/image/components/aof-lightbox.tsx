"use client";

import { IconSquareRoundedX } from "@tabler/icons-react";
import { createFocusTrap, type FocusTrap } from "focus-trap";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Lightbox, { type Slide } from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import { AOFButton } from "../../../shared/components/aof-button";
import { AOFTooltip } from "../../../shared/components/aof-tooltip";
import {
  AOFControlBar,
  AOFControlBarSeparator,
} from "../../data-table/components/aof-control-bar";
import { AOFLightboxArrow } from "./aof-lightbox-arrow";

/**
 * The library asks every slide for a source; ours are all drawn by the App
 * (`render.slide`), so none is ever fetched.
 */
const APP_SLIDE = { src: "" } as const;

/**
 * The library's backdrop from the Design's token. Its layer sits over the
 * frame and under the shadcn layer's dialogs (z-50): an App's confirm opened
 * from the capsule shows above the preview, never beneath.
 */
const STYLES = {
  root: {
    "--yarl__color_backdrop": "var(--background)",
    "--yarl__portal_zindex": "40",
  },
};
const CAROUSEL = { finite: true, padding: 0 };
/** A pull up or down closes the preview, as in a phone's own gallery. */
const CONTROLLER = { closeOnPullDown: true, closeOnPullUp: true };
/** Its own controls (the capsule, the arrows) replace the library's toolbar. */
const TOOLBAR = { buttons: [] };

/**
 * The library has no focus trap: this keeps Tab and Shift+Tab inside the
 * lightbox's dialog while it is open. Escape and the focus handed back to the
 * opener stay the library's (it already does both).
 */
const TrapFocus = ({ paused }: { paused: boolean }) => {
  const marker = useRef<HTMLSpanElement>(null);
  const trap = useRef<FocusTrap | null>(null);
  useEffect(() => {
    const dialog = marker.current?.closest('[role="dialog"]');
    if (!(dialog instanceof HTMLElement)) {
      return;
    }
    const made = createFocusTrap(dialog, {
      allowOutsideClick: true,
      escapeDeactivates: false,
      fallbackFocus: dialog,
      initialFocus: false,
      returnFocusOnDeactivate: false,
    });
    made.activate();
    trap.current = made;
    return () => {
      made.deactivate();
      trap.current = null;
    };
  }, []);
  useEffect(() => {
    if (paused) {
      trap.current?.pause();
    } else {
      trap.current?.unpause();
    }
  }, [paused]);
  return <span aria-hidden className="hidden" ref={marker} />;
};

/**
 * The element the library draws into. The library hides (`inert`,
 * `aria-hidden`) every sibling of its own portal, and by default that is the
 * whole page, the toaster with it: a toast or the Install hint sent while the
 * preview is open could not be read or closed. A container of its own under
 * `<body>` leaves the library no sibling to hide. The dialog is still modal
 * to assistive tech (`aria-modal`) and its Tab stays inside (`TrapFocus`).
 */
const usePortalRoot = () => {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const element = document.createElement("div");
    document.body.append(element);
    setRoot(element);
    return () => element.remove();
  }, []);
  return root;
};

export type AOFLightboxProps = {
  /** Controls in the bottom capsule beside Close (an App's heart, its remove button). */
  actions?: ReactNode;
  /** Drawn at the top, in the middle: the photo's own words. */
  caption?: ReactNode;
  count: number;
  index: number;
  labels: {
    close: string;
    next: string;
    /** The position's words, with `{index}` and `{total}` in them. */
    position: string;
    previous: string;
    title: string;
  };
  onIndexChange: (index: number) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  /**
   * An App's own dialog is open above the preview (a confirm from its
   * toolbar): the focus trap stands aside so the dialog's own can hold focus.
   */
  paused?: boolean;
  /** The App draws slide `index`: the picture with its blur. */
  renderSlide: (index: number) => ReactNode;
};

/**
 * A full-screen preview that steps through `count` slides: previous and next
 * (disabled at the ends), the arrow keys, a swipe, Close and Escape, over
 * `yet-another-react-lightbox`. It draws no picture and names no App: the App
 * passes each slide through `renderSlide`, its own buttons as `actions` and
 * every word as `labels`. Nothing lies under a notch or a home indicator.
 */
export const AOFLightbox = ({
  actions,
  caption,
  count,
  index,
  labels,
  onIndexChange,
  onOpenChange,
  open,
  paused = false,
  renderSlide,
}: AOFLightboxProps) => {
  // The library hands focus back to where the first focus event came from,
  // which a Tab inside the preview loses: remember the opener ourselves.
  const opener = useRef<Element | null>(null);
  useLayoutEffect(() => {
    if (!open) {
      return;
    }
    opener.current = document.activeElement;
    return () => {
      const back = opener.current;
      if (back instanceof HTMLElement && back.isConnected) {
        back.focus();
      }
    };
  }, [open]);
  // One placeholder slide per photo: the App draws them, through `render.slide`.
  const root = usePortalRoot();
  const portal = useMemo(() => ({ root: () => root }), [root]);
  const slides = useMemo(
    () => Array.from({ length: count }, (): Slide => ({ ...APP_SLIDE })),
    [count]
  );
  const close = useCallback(() => onOpenChange(false), [onOpenChange]);
  const library = useMemo(
    () => ({
      "{index} of {total}": labels.position,
      Close: labels.close,
      Lightbox: labels.title,
      Next: labels.next,
      "Photo gallery": labels.title,
      Previous: labels.previous,
    }),
    [labels]
  );
  const on = useMemo(
    () => ({
      view: ({ index: current }: { index: number }) => {
        // The library also reports the index it opened on.
        if (current !== index) {
          onIndexChange(current);
        }
      },
    }),
    [index, onIndexChange]
  );
  const render = useMemo(
    () => ({
      buttonNext: () => (
        <AOFLightboxArrow direction="next" label={labels.next} />
      ),
      buttonPrev: () => (
        <AOFLightboxArrow direction="prev" label={labels.previous} />
      ),
      controls: () => (
        <>
          <TrapFocus paused={paused} />
          <AOFControlBar className="absolute bottom-(--gutter-bottom) left-1/2 -translate-x-1/2 gap-2 px-2">
            {actions}
            {actions ? <AOFControlBarSeparator /> : null}
            <AOFTooltip label={labels.close}>
              <AOFButton
                aria-label={labels.close}
                onClick={close}
                size="icon"
                variant="ghost"
              >
                <IconSquareRoundedX aria-hidden className="size-6" />
              </AOFButton>
            </AOFTooltip>
          </AOFControlBar>
          <div className="absolute inset-x-0 top-(--gutter-top) flex flex-col items-center gap-2 px-(--gutter-left) text-center">
            {caption}
          </div>
        </>
      ),
      // The photo stays inside the safe area and clear of the capsule, the
      // caption and (from a tablet up) the arrows: nothing lies over it. It is
      // centred between the caption and the capsule (4rem each, which both
      // are 42px tall under) and on the screen (the wider side's gutter).
      slide: ({ slide }: { slide: Slide }) => (
        <div className="size-full px-[max(var(--gutter-left),var(--gutter-right))] pt-[calc(var(--gutter-top)+4rem)] pb-[calc(var(--gutter-bottom)+4rem)] sm:px-[calc(max(var(--gutter-left),var(--gutter-right))+4rem)]">
          {renderSlide(slides.indexOf(slide))}
        </div>
      ),
    }),
    [actions, caption, close, labels, paused, renderSlide, slides]
  );
  if (root === null) {
    return null;
  }
  return (
    <Lightbox
      carousel={CAROUSEL}
      close={close}
      controller={CONTROLLER}
      index={index}
      labels={library}
      on={on}
      open={open}
      portal={portal}
      render={render}
      slides={slides}
      styles={STYLES}
      toolbar={TOOLBAR}
    />
  );
};
