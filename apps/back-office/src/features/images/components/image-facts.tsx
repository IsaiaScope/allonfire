import { cn } from "@allonfire/ui/shared/utils/utils";
import type { ReactNode } from "react";

/**
 * What a picture's facts (its name, size, dimensions, when it was added) are
 * set in: each under a small label, never joined by a separator. The Edit
 * page's summary and a picked picture's card on the Add page share it.
 */
export const ImageFacts = ({
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
export const ImageFact = ({
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

/** A picture's name in a fact: cut after two lines, whatever its length. */
export const ImageName = ({ children }: { children: ReactNode }) => (
  <span className="wrap-break-word line-clamp-2 leading-snug">{children}</span>
);
