import type { ReactNode } from "react";
import { cn } from "../lib/utils";
import { AOFField } from "./aof-field";
import { AOFInput, type AOFInputProps } from "./aof-input";
import { AOFFieldTile, AOFFieldTitle, aofFieldInput } from "./aof-text-field";

export type AOFReadOnlyFieldProps = Omit<
  AOFInputProps,
  "defaultValue" | "disabled" | "name" | "onChange" | "readOnly" | "value"
> & {
  id: string;
  label: ReactNode;
  /** Drawn at the input's start; decoration, hidden from screen readers. */
  icon?: ReactNode;
  value: string;
};

/**
 * A value an AOF form shows but never changes (an email), in a text field's
 * box and rhythm: its label, its icon tile, the input, and the error line's
 * kept place, so it lines up with the fields beside it. The input is
 * disabled, so nobody reaches or edits it, yet drawn at full strength, as
 * an enabled field's box; it has no `name`: the form never posts it.
 */
export const AOFReadOnlyField = ({
  className,
  icon,
  id,
  label,
  value,
  ...input
}: AOFReadOnlyFieldProps) => (
  <AOFField role="none">
    <AOFFieldTitle htmlFor={id}>{label}</AOFFieldTitle>
    <div className="relative">
      {icon ? <AOFFieldTile>{icon}</AOFFieldTile> : null}
      <AOFInput
        {...input}
        className={cn(
          aofFieldInput({ icon: Boolean(icon) }),
          "text-muted-foreground disabled:cursor-default disabled:bg-transparent disabled:opacity-100 dark:disabled:bg-input/30",
          className
        )}
        disabled
        id={id}
        value={value}
      />
    </div>
    <div className="min-h-6" />
  </AOFField>
);
