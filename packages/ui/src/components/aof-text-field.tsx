"use client";

import { useSelector } from "@tanstack/react-form";
import { cva, type VariantProps } from "class-variance-authority";
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

// primary: the tall field a page leads with, its icon white on a dark tile
// like station signage. Built on shadcn's tokens only, so any Design wears it.
// Text longer than the box ends in an ellipsis while the field is not focused.
const inputVariants = cva("text-ellipsis", {
  defaultVariants: { variant: "default" },
  variants: {
    variant: { default: "", primary: "h-12 text-base md:text-base" },
  },
});
const labelVariants = cva("", {
  defaultVariants: { variant: "default" },
  variants: { variant: { default: "", primary: "font-bold" } },
});
const iconVariants = cva(
  "pointer-events-none absolute flex items-center justify-center",
  {
    defaultVariants: { variant: "default" },
    variants: {
      variant: {
        default: "inset-y-0 left-0 w-8 text-muted-foreground *:size-4",
        primary:
          "dark inset-y-1.5 left-1.5 w-9 rounded-sm bg-background text-foreground *:size-5",
      },
    },
  }
);

export type AOFTextFieldVariant = NonNullable<
  VariantProps<typeof inputVariants>["variant"]
>;

// Room for the icon tile, per variant.
const ICON_PADDING = {
  default: "pl-8",
  primary: "pl-13",
} as const satisfies Record<AOFTextFieldVariant, string>;

// The reveal button sits at the input's end, its box matching the icon tile.
const REVEAL_PADDING = {
  default: "pr-8",
  primary: "pr-12",
} as const satisfies Record<AOFTextFieldVariant, string>;
const REVEAL_BUTTON = {
  default: "top-0 right-0",
  primary: "top-1.5 right-1.5 size-9 *:size-5",
} as const satisfies Record<AOFTextFieldVariant, string>;

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
  variant?: AOFTextFieldVariant;
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
  variant = "default",
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
      <AOFFieldLabel className={labelVariants({ variant })} htmlFor={inputId}>
        {label}
      </AOFFieldLabel>
      <div className="relative">
        {icon ? (
          <span aria-hidden="true" className={iconVariants({ variant })}>
            {icon}
          </span>
        ) : null}
        <AOFInput
          {...input}
          aria-describedby={showsErrors ? errorId : undefined}
          aria-invalid={marked || undefined}
          className={cn(
            inputVariants({ variant }),
            icon && ICON_PADDING[variant],
            reveal && REVEAL_PADDING[variant],
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
              "absolute text-muted-foreground",
              REVEAL_BUTTON[variant]
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
      <div className="min-h-5">
        <AOFFieldError errors={errors} id={errorId} />
      </div>
    </AOFField>
  );
};
