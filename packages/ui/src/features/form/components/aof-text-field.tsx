"use client";

import { IconEye, IconEyeOff } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { AOFButton } from "../../../shared/components/aof-button";
import { aofInputEndButton } from "../../../shared/components/aof-input-clear";
import { cn } from "../../../shared/utils/utils";
import { useShownErrors } from "../hooks/use-shown-errors";
import { useFieldContext } from "../utils/form-context";
import {
  AOFField,
  AOFFieldError,
  type AOFFieldErrorProps,
  AOFFieldLabel,
} from "./aof-field";
import { AOFInput, type AOFInputProps } from "./aof-input";

// The tall field of every AOF form, its icon white on a dark tile like station
// signage. Built on shadcn's tokens only, so any Design wears it. Text longer
// than the box ends in an ellipsis while the field is not focused.

/** The field's tall input, room left at its start for the icon tile. */
export const aofFieldInput = cva(
  "h-(--field-height) text-ellipsis text-base md:text-base",
  { variants: { icon: { false: "", true: "pl-13" } } }
);

/** The field's icon, white on a dark tile; decoration, hidden from screen readers. */
export const AOFFieldTile = ({ children }: { children: ReactNode }) => (
  <span
    aria-hidden="true"
    className="dark pointer-events-none absolute inset-y-1 left-1 flex w-(--field-tile) items-center justify-center rounded-sm bg-background text-foreground *:size-5"
  >
    {children}
  </span>
);

/**
 * The label, bold, with an asterisk beside it when the field is required:
 * outside the `<label>`, so the field's name stays its words alone, and
 * hidden from screen readers, as the input already says it is required.
 * `htmlFor` names the input it labels; a field with no one input (the
 * avatar's drop area) leaves it out.
 */
export const AOFFieldTitle = ({
  children,
  htmlFor,
  required,
}: {
  children: ReactNode;
  htmlFor?: string | undefined;
  required?: boolean | undefined;
}) => {
  const label = (
    <AOFFieldLabel className="font-bold" htmlFor={htmlFor}>
      {children}
    </AOFFieldLabel>
  );
  return required ? (
    <div className="flex items-baseline gap-1">
      {label}
      <span
        aria-hidden="true"
        className="font-bold text-destructive leading-none"
      >
        *
      </span>
    </div>
  ) : (
    label
  );
};

/**
 * The line under a field kept free for its errors, so an error appearing
 * moves nothing below it; a field that never errs keeps the place empty, to
 * line up with the fields beside it.
 */
export const AOFFieldErrorLine = (
  props: Pick<AOFFieldErrorProps, "errors" | "id">
) => (
  <div className="min-h-6">
    <AOFFieldError {...props} />
  </div>
);

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
  invalid?: boolean | undefined;
  /**
   * For a password: the name, in the page's language, of an eye button at the
   * input's end that shows and hides what was typed ("Show password");
   * `aria-pressed` says which.
   */
  reveal?: string | undefined;
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
  const errors = useShownErrors(field);
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
      <AOFFieldTitle htmlFor={inputId} required={input.required}>
        {label}
      </AOFFieldTitle>
      <div className="relative">
        {icon ? <AOFFieldTile>{icon}</AOFFieldTile> : null}
        <AOFInput
          {...input}
          aria-describedby={showsErrors ? errorId : undefined}
          aria-invalid={marked || undefined}
          className={cn(
            aofFieldInput({ icon: Boolean(icon) }),
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
            className={aofInputEndButton()}
            onClick={toggleRevealed}
            size="icon"
            type="button"
            variant="ghost"
          >
            {revealed ? <IconEyeOff aria-hidden /> : <IconEye aria-hidden />}
          </AOFButton>
        ) : null}
      </div>
      <AOFFieldErrorLine errors={errors} id={errorId} />
    </AOFField>
  );
};
