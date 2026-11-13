"use client";

import { AOFSubmitButton } from "@allonfire/ui/features/form/components/aof-submit-button";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconArrowBackUp, IconLoader2 } from "@tabler/icons-react";
import type { ComponentProps, ReactNode } from "react";
import { Link } from "@/features/i18n/navigation";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { ActionKanji, kanjiAction } from "./brush-kanji";

/** A form's submit button: its words, pictogram and kanji. */
export type FormSubmit = {
  icon: ReactNode;
  kanji: string;
  label: string;
  pendingLabel: string;
};

/**
 * A form's last row: Cancel back to `cancelHref` (a list, with its rows
 * already there: ADR 0028) and its submit, both kanji buttons. At the bottom
 * of the Section when the form is shorter; 8px under the form alert's kept
 * place at least, as in Sign in.
 */
export const FormActions = ({
  cancelHref,
  cancelLabel,
  disabled,
  pending,
  submit,
}: {
  cancelHref: ComponentProps<typeof Link>["href"];
  cancelLabel: string;
  /** Nothing to submit yet. */
  disabled?: boolean | undefined;
  pending: boolean;
  submit: FormSubmit;
}) => (
  <div className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
    <Link
      className={cn(
        aofButtonVariants({ size: "field", variant: "destructive" }),
        kanjiAction()
      )}
      href={cancelHref}
      prefetch
    >
      <ActionKanji kanji={ACTION_KANJI.CANCEL} />
      <IconArrowBackUp aria-hidden />
      {cancelLabel}
    </Link>
    <AOFSubmitButton
      className={kanjiAction()}
      disabled={disabled}
      pending={pending}
      pendingChildren={
        <>
          <ActionKanji kanji={submit.kanji} />
          <IconLoader2 aria-hidden className="animate-spin" />
          {submit.pendingLabel}
        </>
      }
      size="field"
    >
      <ActionKanji kanji={submit.kanji} />
      {submit.icon}
      {submit.label}
    </AOFSubmitButton>
  </div>
);
