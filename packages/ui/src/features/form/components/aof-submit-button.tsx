import type { ReactNode } from "react";
import {
  AOFButton,
  type AOFButtonProps,
} from "../../../shared/components/aof-button";

export type AOFSubmitButtonProps = Omit<
  AOFButtonProps,
  "type" | "aria-busy"
> & {
  /** True while the server action runs: `useActionState`'s flag. */
  pending: boolean;
  /** What the button says while pending. */
  pendingChildren: ReactNode;
};

/**
 * An AOF form's submit button. `pending` comes from the caller because the
 * action's transition, not TanStack's `isSubmitting`, knows when the request
 * ends; while pending the button is disabled, so a second click does nothing.
 * A form may also switch it off for good (`disabled`) once its job is done.
 */
export const AOFSubmitButton = ({
  children,
  disabled,
  pending,
  pendingChildren,
  ...props
}: AOFSubmitButtonProps) => {
  const label = pending ? pendingChildren : children;
  return (
    <AOFButton
      {...props}
      aria-busy={pending || undefined}
      disabled={pending || disabled}
      type="submit"
    >
      {label}
    </AOFButton>
  );
};
