import { cva } from "class-variance-authority";

/**
 * Keeps what ui lays over the page inside the safe edges (base.css
 * `--gutter-*`): clear of a phone's corners, notch and home indicator,
 * whichever way it is held. A fixed box centred on the screen (a dialog): it
 * centres between the edges, which differ (the Dynamic Island above, the home
 * indicator below), never grows past them, and scrolls what does not fit.
 */
export const centredInSafeArea = cva(
  "top-[calc(50%+(var(--gutter-top)-var(--gutter-bottom))/2)] left-[calc(50%+(var(--gutter-left)-var(--gutter-right))/2)] max-h-[calc(100dvh-var(--gutter-top)-var(--gutter-bottom))] max-w-[calc(100vw-var(--gutter-left)-var(--gutter-right))] overflow-y-auto"
);
