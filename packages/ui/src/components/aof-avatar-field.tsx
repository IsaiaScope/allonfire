"use client";

import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IconCrop, IconPhotoSquareRounded } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import { useCallback, useId, useState } from "react";
import { avatarRemoval } from "../lib/avatar-change";
import { useFieldContext } from "../lib/form-context";
import { shownErrors } from "../lib/form-errors";
import {
  useCropPictures,
  useHeldFile,
  useObjectUrl,
} from "../lib/use-avatar-pictures";
import {
  AOFAvatarCropDialog,
  type AOFAvatarCropDialogProps,
  type AOFAvatarCropLabels,
} from "./aof-avatar-crop-dialog";
import { AOFButton } from "./aof-button";
import { AOFField, AOFFieldError, AOFFieldLabel } from "./aof-field";
import {
  AOFFileUpload,
  type AOFFileUploadItem,
  type AOFFileUploadLabels,
  type AOFFileUploadProps,
} from "./aof-file-upload";

/**
 * The field's words, in the page's language: the drop area's own (`busy`
 * while an iPhone's HEIC is turned into a JPEG), the crop dialog's, and its
 * own three.
 */
export type AOFAvatarFieldLabels = AOFAvatarCropLabels &
  Required<AOFFileUploadLabels> & {
    cropAgain: string;
    /** The row of the picture the User already holds. */
    current: string;
    /** Refused: not a picture it can read, even converted. */
    unreadable: string;
  };

export type AOFAvatarFieldProps = {
  label: string;
  /**
   * The picture the User already holds, drawn while no file is picked; the X
   * removes it.
   */
  current?: string | null | undefined;
  labels: AOFAvatarFieldLabels;
  /** The choose button, dressed by the App. */
  triggerProps?: AOFFileUploadProps["triggerProps"];
  /** The crop dialog's title and buttons, dressed by the App. */
  cropProps?:
    | Omit<
        AOFAvatarCropDialogProps,
        "labels" | "onCancel" | "onUse" | "open" | "src"
      >
    | undefined;
};

/** The row id of the picture the User already holds. */
const CURRENT_ID = "current";

/** The field's own refusal first, then its schema's errors once shown. */
const useFieldErrors = (
  field: ReturnType<typeof useFieldContext<File | null>>,
  refusal: string | null
) => {
  const submissionAttempts = useSelector(
    field.form.store,
    (state) => state.submissionAttempts
  );
  return [
    ...(refusal ? [{ message: refusal }] : []),
    ...shownErrors(field.state.meta.errors, {
      isBlurred: field.state.meta.isBlurred,
      submissionAttempts,
    }),
  ];
};

/**
 * The picture in use as the upload's one row (or, with none picked, the
 * picture the User already holds): the name picked (an iPhone's
 * HEIC keeps its own), the cropped file's size, and Crop again while the
 * original is at hand.
 */
const heldItems = ({
  cropAgain,
  cropAgainLabel,
  current,
  pickedName,
  preview,
  value,
}: {
  cropAgain: (() => void) | null;
  cropAgainLabel: string;
  /** The picture the User holds, while kept, and its row's name. */
  current: { label: string; src: string } | null;
  pickedName: string;
  preview: string | null;
  value: File | null;
}): AOFFileUploadItem[] => {
  if (!value) {
    return current
      ? [{ id: CURRENT_ID, name: current.label, preview: current.src }]
      : [];
  }
  return [
    {
      actions: cropAgain ? (
        <AOFButton onClick={cropAgain} size="sm" type="button" variant="ghost">
          <IconCrop aria-hidden />
          {cropAgainLabel}
        </AOFButton>
      ) : null,
      id: value.name,
      name: pickedName || value.name,
      preview,
      size: value.size,
    },
  ];
};

/**
 * A picture in an AOF form (ADR 0017), bound to its TanStack field as a
 * `File`: a click, a drop or a paste on its drop area opens the crop dialog
 * (an iPhone's HEIC is turned into a JPEG first, so it crops in every
 * browser), and Use keeps the square both in the field and in its own file
 * input, named as the field, so the form's post sends it. The picture in use
 * is listed under the area: Crop again reopens the same original, the X
 * removes it. A file too large, or one it cannot read, is refused in the
 * field's error line. Given the picture a User already holds (`current`), it
 * lists that one while no file is picked: removing a new pick goes back to
 * it, and removing it posts the removal (`avatarRemoval`): the form's action
 * reads which of the three it got with `avatarChangeOf`.
 */
export const AOFAvatarField = ({
  cropProps,
  current,
  label,
  labels,
  triggerProps,
}: AOFAvatarFieldProps) => {
  const field = useFieldContext<File | null>();
  const [refusal, setRefusal] = useState<string | null>(null);
  // The current picture removed; a new pick then replaces nothing.
  const [removed, setRemoved] = useState(false);
  const { holdInInput, inputRef } = useHeldFile();
  const errorId = useId();
  const preview = useObjectUrl(field.state.value);
  const errors = useFieldErrors(field, refusal);
  const unreadable = useCallback(
    () => setRefusal(labels.unreadable),
    [labels.unreadable]
  );
  const crop = useCropPictures(unreadable);
  const { forget, keep, pick } = crop;

  const refuse = useCallback(
    (_: File, message: string) => setRefusal(message),
    []
  );
  const accept = useCallback(
    async (file: File) => {
      if (await pick(file)) {
        setRefusal(null);
      }
    },
    [pick]
  );
  const use = useCallback(
    (file: File) => {
      keep();
      field.handleChange(file);
      holdInInput(file);
    },
    [field, holdInInput, keep]
  );
  const remove = useCallback(() => {
    if (!field.state.value) {
      setRemoved(true);
      return;
    }
    field.handleChange(null);
    forget();
    setRefusal(null);
    holdInInput(null);
  }, [field, forget, holdInInput]);

  const items = heldItems({
    cropAgain: crop.cropAgain,
    cropAgainLabel: labels.cropAgain,
    current:
      current && !removed ? { label: labels.current, src: current } : null,
    pickedName: crop.pickedName,
    preview,
    value: field.state.value,
  });

  return (
    <AOFField data-invalid={errors.length > 0 || undefined} role="none">
      <AOFFieldLabel className="font-bold">{label}</AOFFieldLabel>
      <AOFFileUpload
        accept={IMAGE.INPUT_ACCEPT}
        aria-describedby={errors.length > 0 ? errorId : undefined}
        busy={crop.preparing}
        icon={
          <IconPhotoSquareRounded
            aria-hidden
            className="size-5 text-muted-foreground"
          />
        }
        items={items}
        label={label}
        labels={labels}
        maxBytes={AVATAR.INPUT_BYTES}
        onFileAccept={accept}
        onFileReject={refuse}
        onRemove={remove}
        triggerProps={triggerProps}
      />
      <input
        aria-hidden
        className="hidden"
        name={field.name}
        ref={inputRef}
        tabIndex={-1}
        type="file"
      />
      {removed && !field.state.value ? (
        <input type="hidden" {...avatarRemoval(field.name)} />
      ) : null}
      <div className="min-h-6">
        <AOFFieldError errors={errors} id={errorId} />
      </div>
      {crop.cropUrl ? (
        <AOFAvatarCropDialog
          {...cropProps}
          // A new picture starts its own crop, never the last one's zoom.
          key={crop.cropUrl}
          labels={labels}
          onCancel={crop.cancel}
          onUse={use}
          open={crop.cropping}
          src={crop.cropUrl}
        />
      ) : null}
    </AOFField>
  );
};
