"use client";

import { useTranslations } from "next-intl";
import { FormActions, type FormSubmit } from "@/shared/components/form-actions";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** An Image form's last row: Cancel back to the list, and its submit, both kanji buttons. */
export const ImageFormActions = ({
  disabled,
  pending,
  submit,
}: {
  /** Nothing to submit yet. */
  disabled?: boolean | undefined;
  pending: boolean;
  submit: FormSubmit;
}) => {
  const t = useTranslations("Images.form");
  return (
    <FormActions
      cancelHref={BACK_OFFICE.PAGE.STORAGE_IMAGES}
      cancelLabel={t("cancel")}
      disabled={disabled}
      pending={pending}
      submit={submit}
    />
  );
};
