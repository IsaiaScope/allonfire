import { cn } from "@allonfire/ui/lib/utils";
import type { ComponentProps } from "react";

/**
 * A Shinkansen in profile, nose forward on its rail: the Back office's line
 * pictogram. Drawn on lucide's grid (24, 2px round strokes, `currentColor`)
 * so it sits beside lucide icons; lucide's own trains are a front view.
 */
export const Shinkansen = ({ className, ...props }: ComponentProps<"svg">) => (
  <svg
    aria-hidden
    className={cn("size-6", className)}
    fill="none"
    stroke="currentColor"
    strokeLinecap="round"
    strokeLinejoin="round"
    strokeWidth={2}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
    {...props}
  >
    <path d="M2 7.5h7c6.5 0 11 3.6 13 7.5v1H2" />
    <path d="M12.5 9c2.4.7 4.4 2 5.8 3.7h-5.8Z" />
    <path d="M4 11h1.5" />
    <path d="M8 11h1.5" />
    <circle cx="6" cy="19" r="1.5" />
    <circle cx="16" cy="19" r="1.5" />
  </svg>
);
