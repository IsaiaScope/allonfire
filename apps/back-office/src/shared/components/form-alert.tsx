import { cn } from "@allonfire/ui/lib/utils";
import { IconAlertTriangle } from "@tabler/icons-react";
import type { ComponentProps } from "react";

/**
 * Why a form's last submit failed, boxed, at the end of the form, in a place
 * kept for it whether or not there is a message: always the box's height on
 * two lines (54px; compact, since a phone has little height to spare). A
 * message on one line leaves the rest empty; a longer one stops at two lines
 * with an ellipsis (the whole of it still read out), so its arrival or its
 * going never moves anything, like a field's own error line. Always there, a
 * live region: its words are announced as they arrive, which an alert
 * inserted later is not, reliably.
 */
export const FormAlert = ({
  children,
  className,
  ...props
}: ComponentProps<"div">) => (
  <div className={cn("min-h-13.5", className)} role="alert" {...props}>
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
);
