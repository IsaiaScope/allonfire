"use client";

import {
  AOFFormActionsSkeleton,
  AOFFormBar,
} from "@allonfire/ui/features/form/components/aof-form-skeleton";
import { useImageFileInput } from "@allonfire/ui/features/image/upload/hooks/use-image-file-input";
import type {
  AOFAddImagesDressing,
  AOFImageActionsProps,
  AOFImageButtonProps,
  AOFImagePickerProps,
} from "@allonfire/ui/features/image/upload/types/add-images-dressing";
import {
  AOFButton,
  aofButtonVariants,
} from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconPhotoPlus, IconPlus, IconTrashX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { CardFrame } from "@/shared/components/card-frame";
import { FormActions } from "@/shared/components/form-actions";
import {
  ToolbarActionBody,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { IMAGES } from "../constants/images";

const Card: AOFAddImagesDressing["Card"] = ({ children, ...props }) => (
  <CardFrame kanji={IMAGES.KANJI.ADD} {...props}>
    {children}
  </CardFrame>
);

const PickerSkeleton = () => (
  <AOFFormBar className="w-44 shrink-0" part="button" tone="primary" />
);

const Picker = ({ disabled, pick }: AOFImagePickerProps) => {
  const t = useTranslations("Common.ImageUpload.pick");
  const { inputProps, open } = useImageFileInput(pick);
  return (
    <>
      <input {...inputProps} />
      <AOFButton
        aria-label={t("button")}
        className={cn("shrink-0", toolbarActionClass("labeled"))}
        disabled={disabled}
        onClick={open}
        type="button"
      >
        <ToolbarActionBody
          icon={<IconPlus aria-hidden />}
          kanjiProps={{ kanji: IMAGES.KANJI.ADD }}
          label={t("button")}
          shape="labeled"
        />
      </AOFButton>
    </>
  );
};

const Apply = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <AOFButton
    className={cn(aofButtonVariants({ size: "field" }), kanjiAction())}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <ActionKanji kanji={IMAGES.KANJI.APPLY} />
    {label}
  </AOFButton>
);

const Remove = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <AOFButton
    aria-label={label}
    className={toolbarActionClass("icon", "destructive")}
    disabled={disabled}
    onClick={onClick}
    type="button"
  >
    <ToolbarActionBody
      icon={<IconTrashX aria-hidden />}
      kanjiProps={{ kanji: IMAGES.KANJI.DELETE }}
      label={label}
      shape="icon"
    />
  </AOFButton>
);

const Actions = ({
  cancelHref,
  cancelLabel,
  disabled,
  pending,
  pendingLabel,
  submitLabel,
}: AOFImageActionsProps) => (
  <FormActions
    cancelHref={cancelHref}
    cancelLabel={cancelLabel}
    disabled={disabled}
    pending={pending}
    submit={{
      icon: <IconPhotoPlus aria-hidden />,
      kanji: IMAGES.KANJI.ADD,
      label: submitLabel,
      pendingLabel,
    }}
  />
);

/** The Add Images form in the Back Office's Design: kanji buttons and cards. */
export const ADD_IMAGE_DRESSING: AOFAddImagesDressing = {
  Actions,
  ActionsSkeleton: AOFFormActionsSkeleton,
  Apply,
  Card,
  choice: { ink: BACK_OFFICE.CHOSEN.INK, pill: BACK_OFFICE.CHOSEN.PILL },
  Picker,
  PickerSkeleton,
  Remove,
};
