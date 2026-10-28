"use client";

import { useFieldContext } from "../lib/form-context";
import { AOFGooeyChoice, type AOFGooeyChoiceProps } from "./aof-gooey-choice";

/** A Gooey choice's props, less what the field binds. */
export type AOFChoiceFieldProps = Omit<
  AOFGooeyChoiceProps<string>,
  "name" | "onValueChange" | "value"
>;

/**
 * A Gooey Nav choice in an AOF form (ADR 0017), bound to its TanStack field:
 * it posts under the field's name, so the action reads it from the form.
 */
export const AOFChoiceField = (props: AOFChoiceFieldProps) => {
  const field = useFieldContext<string>();
  return (
    <AOFGooeyChoice
      {...props}
      name={field.name}
      onValueChange={field.handleChange}
      value={field.state.value}
    />
  );
};
