"use client";

import { type ReactNode, useCallback, useId } from "react";
import { AOFGooeyChoice } from "../gooey-nav/components/aof-gooey-choice";
import { useShownErrors } from "../hooks/use-shown-errors";
import { useFieldContext } from "../utils/form-context";
import { AOFField } from "./aof-field";
import { AOFFieldErrorLine } from "./aof-text-field";

/** One option in the group: what it shows and what it posts. */
type AOFToggleOption = { label: string; value: string };

/** One state of a toggle: its words and pictogram. */
type AOFToggleState = { icon: ReactNode; label: string };

export type AOFToggleGroupFieldProps = {
  label: ReactNode;
  /** The chosen option's text and icon colour, as hex. */
  ink: string;
  /** What each toggle says while its option is not chosen. */
  off: AOFToggleState;
  /** What each toggle says while its option is chosen. */
  on: AOFToggleState;
  options: readonly AOFToggleOption[];
  /** The chosen state's pill colour, as hex. */
  pill: string;
  required?: boolean | undefined;
};

const ON = "on";
const OFF = "off";

/** One option's toggle: on or off, posting its value (under the field's name) only while on. */
const OptionToggle = ({
  ink,
  off,
  on,
  option,
  pill,
}: Pick<AOFToggleGroupFieldProps, "ink" | "off" | "on" | "pill"> & {
  option: AOFToggleOption;
}) => {
  const field = useFieldContext<string[]>();
  // A removed row's field is read once more before it unmounts, with no value.
  const chosen = field.state.value ?? [];
  const isOn = chosen.includes(option.value);
  const toggle = useCallback(
    (state: string) => {
      const next = state === ON;
      field.handleChange(
        next
          ? [...chosen, option.value]
          : chosen.filter((value) => value !== option.value)
      );
      field.handleBlur();
    },
    [field, chosen, option.value]
  );
  return (
    <div className="flex flex-col gap-2">
      <span aria-hidden className="font-bold text-sm">
        {option.label}
      </span>
      <AOFGooeyChoice
        ink={ink}
        label={option.label}
        // Unnamed, so it posts nothing: the hidden input below posts the value.
        name=""
        onValueChange={toggle}
        options={[
          { ...off, value: OFF },
          { ...on, value: ON },
        ]}
        pill={pill}
        value={isOn ? ON : OFF}
      />
      {isOn ? (
        <input name={field.name} type="hidden" value={option.value} />
      ) : null}
    </div>
  );
};

/**
 * Several options each switched on or off, as Gooey toggles in an AOF form
 * (ADR 0017), bound to its TanStack field holding the values switched on: each
 * one posts under the field's name, so the action reads them with `getAll`.
 * Its errors show in the line kept free for them.
 */
export const AOFToggleGroupField = ({
  label,
  options,
  required,
  ...toggle
}: AOFToggleGroupFieldProps) => {
  const field = useFieldContext<string[]>();
  const errorId = `${useId()}-error`;
  const errors = useShownErrors(field);
  const showsErrors = errors.length > 0;
  return (
    <AOFField data-invalid={showsErrors || undefined} role="none">
      <fieldset
        aria-describedby={showsErrors ? errorId : undefined}
        aria-invalid={showsErrors || undefined}
        className="flex min-w-0 flex-col gap-4"
      >
        <legend className="mb-2 flex items-baseline gap-1 font-bold text-base">
          {label}
          {required ? (
            <span
              aria-hidden="true"
              className="font-bold text-destructive leading-none"
            >
              *
            </span>
          ) : null}
        </legend>
        {options.map((option) => (
          <OptionToggle {...toggle} key={option.value} option={option} />
        ))}
      </fieldset>
      <AOFFieldErrorLine errors={errors} id={errorId} />
    </AOFField>
  );
};
