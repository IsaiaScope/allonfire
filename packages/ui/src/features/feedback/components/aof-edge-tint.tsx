import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";
import { cn } from "../../../shared/utils/utils";

/**
 * Keeps iOS Safari's toolbar the page's own colour. Safari 26 tints its
 * toolbar from what it samples at the screen's bottom edge: a fixed element
 * there, else the page's content, which turned it green under a green toast
 * or a card's rail. Apple documents no switch (`theme-color` is ignored), so
 * this is the known workaround: a real (not a `::after`, which is never
 * sampled), solid, full-width strip of at least 5px, in the page's ground,
 * under every toast and dialog. It exists only in iOS WebKit
 * (`-webkit-touch-callout`) in a tab (`display-mode: browser`); elsewhere it
 * is `display: none`, so it takes no room and Safari on a Mac, other browsers
 * and an installed App never meet it. `AOFLocaleDocument` mounts it once, so an App never does.
 */
export const AOFEdgeTint = ({
  className,
  ...props
}: ComponentPropsWithoutChildren<"div">) => (
  <div
    aria-hidden
    className={cn(
      "pointer-events-none fixed inset-x-0 bottom-0 z-1 hidden h-[max(12px,env(safe-area-inset-bottom,0px))] bg-background supports-[-webkit-touch-callout:none]:[@media(display-mode:browser)]:block",
      className
    )}
    {...props}
  />
);
