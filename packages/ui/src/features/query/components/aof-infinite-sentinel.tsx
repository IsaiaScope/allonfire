"use client";

import { useEffect, useRef } from "react";

/**
 * The end of an infinite list: an invisible block that calls `onReach` when
 * it scrolls into view and is not `disabled`. The observer is made again
 * whenever `disabled` changes, so a sentinel still in view after a page lands
 * (a tall screen) asks for the next one.
 */
export const AOFInfiniteSentinel = ({
  disabled,
  onReach,
  rootMargin = "600px",
}: {
  disabled: boolean;
  onReach: () => void;
  rootMargin?: string;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const reach = useRef(onReach);
  reach.current = onReach;
  useEffect(() => {
    const element = ref.current;
    if (!element || disabled) {
      return;
    }
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          reach.current();
        }
      },
      { rootMargin }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [disabled, rootMargin]);
  return <div aria-hidden className="h-px" ref={ref} />;
};
