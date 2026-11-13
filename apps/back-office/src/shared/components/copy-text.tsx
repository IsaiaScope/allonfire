"use client";

import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useCallback, useEffect, useState } from "react";
import { COPY } from "@/shared/constants/copy";

/** The words a copy button says, already in the visitor's language. */
export type CopyLabels = {
  /** After a copy. */
  done: string;
  /** After a copy the browser refused. */
  failed: string;
  /** The button's name: what it copies. */
  label: string;
  /** The tip before a copy. */
  tip: string;
};

/**
 * A value copied on a click, shown as the button's own text and cut to an
 * ellipsis when it is long (the whole value is what it copies). Above a row's
 * link, which covers the rest of the row. Its tip says it copies; after a
 * click, a tap or a key, it opens on its own to say it copied (aloud too) for
 * `COPY.COPIED_MS`, since a touch never hovers. `wrap` lets the value run over
 * two lines, wherever it breaks, before the ellipsis (a table keeps one line).
 */
export const CopyText = ({
  className,
  labels,
  value,
  wrap = false,
  ...props
}: Omit<ComponentPropsWithoutChildren<typeof AOFButton>, "onClick"> & {
  labels: CopyLabels;
  value: string;
  wrap?: boolean | undefined;
}) => {
  // A new object each copy, so a second copy restarts the tip's time.
  const [copy, setCopy] = useState<{ result: "done" | "failed" } | null>(null);
  const copied = copy?.result ?? null;
  const [hovered, setHovered] = useState(false);
  const copyValue = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopy({ result: "done" });
    } catch {
      setCopy({ result: "failed" });
    }
  }, [value]);
  useEffect(() => {
    if (!copy) {
      return;
    }
    const timer = setTimeout(() => setCopy(null), COPY.COPIED_MS);
    return () => clearTimeout(timer);
  }, [copy]);
  const open = hovered || copied !== null;
  // The words stay as they were while the tip closes, or its fading frame
  // would say "Copy" again after "Copied".
  const label = copied ? labels[copied] : labels.tip;
  const [shown, setShown] = useState(label);
  if (open && shown !== label) {
    setShown(label);
  }
  return (
    <>
      <AOFTooltip label={shown} onOpenChange={setHovered} open={open}>
        <AOFButton
          aria-label={labels.label}
          variant="link"
          {...props}
          className={cn(
            "relative z-1 h-auto max-w-full justify-start whitespace-normal p-0 text-left text-base text-foreground",
            className
          )}
          onClick={copyValue}
        >
          <span
            className={cn(
              "min-w-0",
              wrap ? "wrap-anywhere line-clamp-2" : "truncate"
            )}
          >
            {value}
          </span>
        </AOFButton>
      </AOFTooltip>
      <span aria-live="polite" className="sr-only">
        {copied ? labels[copied] : null}
      </span>
    </>
  );
};
