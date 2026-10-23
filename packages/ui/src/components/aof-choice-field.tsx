"use client";

import { useFieldContext } from "../lib/form-context";
import {
  AOFGooeyChoice,
  type AOFGooeyChoiceProps,
  type AOFGooeyOption,
} from "./aof-gooey-choice";

export type AOFChoiceFieldProps = Pick<
  AOFGooeyChoiceProps<string>,
  "ink" | "label" | "pill"
> & {
  options: readonly AOFGooeyOption<string>[];
};

/**
 * A Gooey Nav choice in an AOF form (ADR 0017), bound to its TanStack field:
 * it posts under the field's name, so the action reads it from the form.
 */
export const AOFChoiceField = ({
  ink,
  label,
  options,
  pill,
}: AOFChoiceFieldProps) => {
  const field = useFieldContext<string>();
  return (
    <AOFGooeyChoice
      ink={ink}
      label={label}
      name={field.name}
      onValueChange={field.handleChange}
      options={options}
      pill={pill}
      value={field.state.value}
    />
  );
};
