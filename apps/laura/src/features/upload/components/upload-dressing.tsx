"use client";

import {
  AOFFormActionsSkeleton,
  AOFFormBar,
} from "@allonfire/ui/features/form/components/aof-form-skeleton";
import { AOFSubmitButton } from "@allonfire/ui/features/form/components/aof-submit-button";
import { AOFImageDropzone } from "@allonfire/ui/features/image/upload/components/aof-image-dropzone";
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
import { AOFCard } from "@allonfire/ui/shared/components/aof-card";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import {
  IconArrowLeft,
  IconLoader2,
  IconPhotoCirclePlus,
  IconTrashX,
} from "@tabler/icons-react";
import { Link } from "@/features/i18n/navigation";
import { ActionArt } from "@/shared/components/action-art";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { LAURA } from "@/shared/constants/laura";
import { MASCOT } from "@/shared/constants/mascots";

/** The drop area wraps under the heading: the whole row's width; its Choose button is Laura's action button. */
const Picker = ({ disabled, pick }: AOFImagePickerProps) => (
  <AOFImageDropzone
    className="basis-full"
    disabled={disabled}
    pick={pick}
    triggerProps={{
      className: ACTION_DRESSING.className,
      decoration: ACTION_DRESSING.marks.enter,
      size: "field",
    }}
  />
);

/** The drop area's own height (`min-h-52`), so nothing moves when it arrives. */
const PickerSkeleton = () => (
  <AOFFormBar className="h-52 basis-full" part="tile" tone="primary" />
);

const Apply = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <AOFButton
    className={ACTION_DRESSING.className}
    disabled={disabled}
    onClick={onClick}
    size="field"
    type="button"
    variant="outline"
  >
    {ACTION_DRESSING.marks.send}
    {label}
  </AOFButton>
);

/** The tip opens to the left: the button sits in the card's top right corner, where a tip above or below runs off the page. */
const Remove = ({ disabled, label, onClick }: AOFImageButtonProps) => (
  <AOFTooltip contentProps={{ side: "left" }} label={label}>
    <AOFButton
      aria-label={label}
      className="relative isolate overflow-hidden"
      disabled={disabled}
      onClick={onClick}
      size="icon-field"
      type="button"
      variant="outline"
    >
      <ActionArt
        art={MASCOT.REMOVE_ROW}
        className="right-auto left-1/2 size-9 -translate-x-1/2"
      />
      <IconTrashX aria-hidden />
    </AOFButton>
  </AOFTooltip>
);

const Actions = ({
  cancelHref,
  cancelLabel,
  disabled,
  pending,
  pendingLabel,
  submitLabel,
}: AOFImageActionsProps) => (
  <div className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
    <Link
      className={cn(
        aofButtonVariants({ size: "field", variant: "outline" }),
        ACTION_DRESSING.className
      )}
      href={cancelHref}
      prefetch
    >
      {ACTION_DRESSING.marks.back}
      <IconArrowLeft aria-hidden />
      {cancelLabel}
    </Link>
    <AOFSubmitButton
      className={ACTION_DRESSING.className}
      disabled={disabled}
      pending={pending}
      pendingChildren={
        <>
          {ACTION_DRESSING.marks.save}
          <IconLoader2 aria-hidden className="animate-spin" />
          {pendingLabel}
        </>
      }
      size="field"
    >
      {ACTION_DRESSING.marks.save}
      <IconPhotoCirclePlus aria-hidden />
      {submitLabel}
    </AOFSubmitButton>
  </div>
);

/** The Add Images form in Laura's Design: the sea's cards and its mascots behind the buttons. */
export const UPLOAD_DRESSING: AOFAddImagesDressing = {
  Actions,
  ActionsSkeleton: AOFFormActionsSkeleton,
  Apply,
  Card: AOFCard,
  choice: { ink: LAURA.CHOSEN.INK, pill: LAURA.CHOSEN.PILL },
  Picker,
  PickerSkeleton,
  Remove,
};
