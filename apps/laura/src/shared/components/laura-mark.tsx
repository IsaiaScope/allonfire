import {
  LI_MARK,
  liMarkDataUrl,
} from "@allonfire/design/designs/ocean/li-mark";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import type { ComponentProps } from "react";

const face = cva("h-10.5 w-auto", {
  variants: {
    scheme: { dark: "hidden dark:block", light: "dark:hidden" },
  },
});

/**
 * Laura's Li logo at the right end of the frame's header, as the Back Office
 * stands a torii there: muted (75%) so it sits in the header without calling
 * for attention, the navy mark by day and the gold one by night. Decoration
 * only.
 */
export const LauraMark = ({
  className,
}: Pick<ComponentProps<"span">, "className">) => (
  <span
    aria-hidden
    className={cn("ml-auto flex shrink-0 opacity-75", className)}
  >
    <AOFImage
      alt=""
      className={face({ scheme: "light" })}
      height={LI_MARK.HEIGHT}
      sizes="34px"
      src={liMarkDataUrl("LIGHT")}
      width={LI_MARK.WIDTH}
    />
    <AOFImage
      alt=""
      className={face({ scheme: "dark" })}
      height={LI_MARK.HEIGHT}
      sizes="34px"
      src={liMarkDataUrl("DARK")}
      width={LI_MARK.WIDTH}
    />
  </span>
);
