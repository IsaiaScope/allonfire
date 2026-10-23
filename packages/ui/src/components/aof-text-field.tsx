"use client";

import { useSelector } from "@tanstack/react-form";
import { Eye, EyeOff } from "lucide-react";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { useFieldContext } from "../lib/form-context";
import { shownErrors } from "../lib/form-errors";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";
import { AOFField, AOFFieldError, AOFFieldLabel } from "./aof-field";
import { AOFInput, type AOFInputProps } from "./aof-input";

// The tall field of every AOF form, its icon white on a dark tile like station
// signage. Built on shadcn's tokens only, so any Design wears it. Text longer
// than the box ends in an ellipsis while the field is not focused.

export type AOFTextFieldProps = Omit<
  AOFInputProps,
  | "name"
  | "value"
  | "defaultValue"
  | "onChange"
  | "onBlur"
  | "aria-invalid"
  | "aria-describedby"
  | "ref"
> & {
  label: ReactNode;
  /** Drawn at the input's start; decoration, hidden from screen readers. */
  icon?: ReactNode;
  /** An error the server reported for this field: marks it, no message. */
  invalid?: boolean;
  /**
   * For a password: the name, in the page's language, of an eye button at the
   * input's end that shows and hides what was typed ("Show password");
   * `aria-pressed` says which.
   */
  reveal?: string;
};

/**
 * A text input in an AOF form (ADR 0017), bound to its TanStack field. It
 * always sets `name`, so a post before hydration still sends the value, and
 * shows its errors by `shownErrors`' rule in a line kept free for them, so an
 * error appearing moves nothing below it.
 */
export const AOFTextField = ({
  className,
  icon,
  id,
  invalid,
  label,
  reveal,
  type,
  ...input
}: AOFTextFieldProps) => {
  const [revealed, setRevealed] = useState(false);
  const toggleRevealed = useCallback(() => setRevealed((shown) => !shown), []);
  const field = useFieldContext<string>();
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;
  const submissionAttempts = useSelector(
    field.form.store,
    (state) => state.submissionAttempts
  );
  const errors = shownErrors(field.state.meta.errors, {
    isBlurred: field.state.meta.isBlurred,
    submissionAttempts,
  });
  const showsErrors = errors.length > 0;
  const marked = invalid || showsErrors;
  const inputRef = useRef<HTMLInputElement>(null);
  // Text typed or autofilled before hydration sits in the DOM, not in the
  // field: React hydrates without an input event, and its next render would
  // reset the input to the field's empty value. Adopt it first.
  useLayoutEffect(() => {
    const domValue = inputRef.current?.value;
    if (domValue && domValue !== field.state.value) {
      field.handleChange(domValue);
    }
  }, [field]);
  const handleChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) =>
      field.handleChange(event.target.value),
    [field]
  );

  return (
    // One input needs no group: `role="none"` drops shadcn's unnamed one.
    <AOFField data-invalid={marked || undefined} role="none">
      <AOFFieldLabel className="font-bold" htmlFor={inputId}>
        {label}
      </AOFFieldLabel>
      <div className="relative">
        {icon ? (
          <span
            aria-hidden="true"
            className="dark pointer-events-none absolute inset-y-1 left-1 flex w-9 items-center justify-center rounded-sm bg-background text-foreground *:size-5"
          >
            {icon}
          </span>
        ) : null}
        <AOFInput
          {...input}
          aria-describedby={showsErrors ? errorId : undefined}
          aria-invalid={marked || undefined}
          className={cn(
            "h-11 text-ellipsis text-base md:text-base",
            icon && "pl-13",
            reveal && "pr-12",
            className
          )}
          id={inputId}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={handleChange}
          ref={inputRef}
          type={reveal && revealed ? "text" : type}
          value={field.state.value}
        />
        {reveal ? (
          <AOFButton
            aria-controls={inputId}
            aria-label={reveal}
            aria-pressed={revealed}
            className={cn(
              "absolute top-1 right-1 size-9 text-muted-foreground *:size-5"
            )}
            onClick={toggleRevealed}
            size="icon"
            type="button"
            variant="ghost"
          >
            {revealed ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
          </AOFButton>
        ) : null}
      </div>
      <div className="min-h-6">
        <AOFFieldError errors={errors} id={errorId} />
      </div>
    </AOFField>
  );
};
