import { useSelector } from "@tanstack/react-form";
import type { useFieldContext } from "../utils/form-context";
import { type FieldMessage, shownErrors } from "../utils/form-errors";

/**
 * The errors an AOF field shows right now, by `shownErrors`' rule: its
 * validators' errors once the field is left or a submit is tried.
 */
export const useShownErrors = <T>(
  field: ReturnType<typeof useFieldContext<T>>
): FieldMessage[] => {
  const submissionAttempts = useSelector(
    field.form.store,
    (state) => state.submissionAttempts
  );
  return shownErrors(field.state.meta.errors, {
    isBlurred: field.state.meta.isBlurred,
    submissionAttempts,
  });
};
