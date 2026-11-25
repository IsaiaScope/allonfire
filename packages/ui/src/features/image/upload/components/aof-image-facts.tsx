import type { ReactNode } from "react";
import { cn } from "../../../../shared/utils/utils";

/**
 * What a picture's facts (its name, size, dimensions, when it was added) are
 * set in: each under a small label, never joined by a separator. The Edit
 * page's summary and a picked picture's card on the Add page share it.
 */
export const AOFImageFacts = ({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) => (
  <dl className={cn("grid grid-cols-2 gap-x-6 gap-y-3", className)}>
    {children}
  </dl>
);

/** A value under its small label, the value the heavier of the two; numbers in the mono face, a name as written. */
export const AOFImageFact = ({
  children,
  className,
  label,
  mono = true,
}: {
  children: ReactNode;
  className?: string;
  label: string;
  /** Numbers and sizes; false for a name. */
  mono?: boolean;
}) => (
  <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
    <dt className="text-muted-foreground text-xs uppercase tracking-wider">
      {label}
    </dt>
    <dd
      className={cn(
        "font-semibold text-base",
        mono && "font-mono tabular-nums"
      )}
    >
      {children}
    </dd>
  </div>
);

/** A picture's name in a fact: wraps at spaces, cut after two lines; a word wider than the fact ends in an ellipsis, never split. */
export const AOFImageName = ({ children }: { children: ReactNode }) => (
  <span className="line-clamp-2 max-w-full overflow-hidden text-ellipsis leading-snug">
    {children}
  </span>
);
