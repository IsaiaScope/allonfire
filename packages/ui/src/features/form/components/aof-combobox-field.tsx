"use client";

import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@allonfire/shadcn/components/combobox";
import { cva } from "class-variance-authority";
import { type ReactNode, useCallback, useId, useMemo } from "react";
import { useShownErrors } from "../hooks/use-shown-errors";
import { useFieldContext } from "../utils/form-context";
import { AOFField } from "./aof-field";
import {
  AOFFieldErrorLine,
  AOFFieldTile,
  AOFFieldTitle,
} from "./aof-text-field";

/** One choice in the list: what it shows and what it posts. */
export type AOFComboboxOption = { label: string; value: string };

export type AOFComboboxFieldProps = {
  label: ReactNode;
  /** Drawn at the input's start; decoration, hidden from screen readers. */
  icon?: ReactNode;
  options: readonly AOFComboboxOption[];
  /** What the list says when nothing matches what was typed. */
  empty: string;
  placeholder?: string | undefined;
  required?: boolean | undefined;
};

/** The field's tall input group, room left at its start for the icon tile. */
const aofComboboxInput = cva(
  "h-(--field-height) w-full [&_input]:text-base md:[&_input]:text-base",
  { variants: { icon: { false: "", true: "[&_input]:pl-12" } } }
);

const optionLabel = (option: AOFComboboxOption) => option.label;
const optionValue = (option: AOFComboboxOption) => option.value;
const sameOption = (a: AOFComboboxOption, b: AOFComboboxOption) =>
  a.value === b.value;

/**
 * shadcn's combobox in an AOF form, bound to its TanStack field: type to
 * filter `options`, pick one, or clear it (`showClear`) for none, the field
 * then holding "". As tall as the other fields, its icon on their dark tile;
 * it posts the chosen value under the field's name, before hydration too,
 * and shows its errors in the line kept free for them.
 */
export const AOFComboboxField = ({
  empty,
  icon,
  label,
  options,
  placeholder,
  required,
}: AOFComboboxFieldProps) => {
  const field = useFieldContext<string>();
  const id = useId();
  const errorId = `${id}-error`;
  const errors = useShownErrors(field);
  const showsErrors = errors.length > 0;
  const chosen = useMemo(
    () => options.find((option) => option.value === field.state.value) ?? null,
    [options, field.state.value]
  );
  const choose = useCallback(
    (option: AOFComboboxOption | null) =>
      field.handleChange(option?.value ?? ""),
    [field]
  );
  return (
    <AOFField data-invalid={showsErrors || undefined} role="none">
      <AOFFieldTitle htmlFor={id} required={required}>
        {label}
      </AOFFieldTitle>
      <Combobox
        id={id}
        isItemEqualToValue={sameOption}
        items={options}
        itemToStringLabel={optionLabel}
        itemToStringValue={optionValue}
        name={field.name}
        onValueChange={choose}
        required={required}
        value={chosen}
      >
        {/* The tile after the input, so it paints over the input's ground
            and keeps the other fields' dark tile. */}
        <div className="relative">
          <ComboboxInput
            aria-describedby={showsErrors ? errorId : undefined}
            aria-invalid={showsErrors || undefined}
            className={aofComboboxInput({ icon: Boolean(icon) })}
            id={id}
            onBlur={field.handleBlur}
            placeholder={placeholder}
            showClear
          />
          {icon ? <AOFFieldTile>{icon}</AOFFieldTile> : null}
        </div>
        <ComboboxContent>
          <ComboboxEmpty>{empty}</ComboboxEmpty>
          <ComboboxList>
            {(option: AOFComboboxOption) => (
              <ComboboxItem
                // A choice row as tall and as large as the field, as the Users filters' lists draw theirs.
                className="min-h-(--field-height) px-3 text-base"
                key={option.value}
                value={option}
              >
                {option.label}
              </ComboboxItem>
            )}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
      <AOFFieldErrorLine errors={errors} id={errorId} />
    </AOFField>
  );
};
