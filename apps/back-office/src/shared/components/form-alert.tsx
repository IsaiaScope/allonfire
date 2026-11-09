import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconAlertTriangle, IconMailForward } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";

/**
 * What a form's last submit came to, boxed, at the end of the form, in a
 * place kept for it whether or not there is a message: always the box's
 * height on two lines (54px; compact, since a phone has little height to
 * spare). A message on one line leaves the rest empty; a longer one stops at
 * two lines with an ellipsis (the whole of it still read out; a notice gets
 * three, and a form that shows one keeps `min-h-20`), so its arrival
 * or its going never moves anything, like a field's own error line.
 *
 * It holds one of two things in that place: why the try failed (children, an
 * alert) or a note that it did not fail but needs the visitor elsewhere
 * (`notice`, a status: a link sent). Both live regions are always there, so
 * their words are announced as they arrive, which one inserted later is not,
 * reliably.
 */
export const FormAlert = ({
  children,
  className,
  notice,
  ...props
}: ComponentProps<"div"> & { notice?: ReactNode }) => (
  <div className={cn("min-h-13.5", className)}>
    <div role="alert" {...props}>
      {children ? (
        <p className="flex items-start gap-2 rounded-md border border-destructive bg-destructive/10 px-3 py-1.5 text-sm">
          <IconAlertTriangle
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-destructive"
          />
          <span className="line-clamp-2">{children}</span>
        </p>
      ) : null}
    </div>
    <div role="status">
      {notice ? (
        <p className="flex items-start gap-2 rounded-md border border-primary bg-primary/10 px-3 py-1.5 text-sm">
          <IconMailForward
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-primary"
          />
          <span className="line-clamp-3">{notice}</span>
        </p>
      ) : null}
    </div>
  </div>
);
