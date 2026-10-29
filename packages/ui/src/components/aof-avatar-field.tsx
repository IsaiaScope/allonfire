"use client";

import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { IconCrop, IconPhotoSquareRounded } from "@tabler/icons-react";
import { useSelector } from "@tanstack/react-form";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { canDraw } from "../lib/crop-image";
import { useFieldContext } from "../lib/form-context";
import { shownErrors } from "../lib/form-errors";
import { heicToJpeg } from "../lib/heic-to-jpeg";
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
  type AOFFileUploadProps,
} from "./aof-file-upload";

/** The field's words, in the page's language. */
export type AOFAvatarFieldLabels = AOFAvatarCropLabels & {
  change: string;
  choose: string;
  cropAgain: string;
  /** The row of the picture the User already holds. */
  current: string;
  /** The drop area's title: "Drop your picture here". */
  drop: string;
  /** The formats taken and the largest size, under the title. */
  formats: string;
  /** While an iPhone's HEIC is turned into a JPEG. */
  preparing: string;
  remove: string;
  /** Refused: over `AVATAR.INPUT_BYTES`. */
  tooLarge: string;
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
  /**
   * The form name posted as `"true"` once `current` is removed and no file
   * replaces it; nothing is posted otherwise.
   */
  removedName?: string | undefined;
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

/**
 * The field's file input, the one the form posts: `holdInInput` puts the
 * cropped square in it, or nothing, without a change event.
 */
const useHeldFile = (name: string) => {
  const rootRef = useRef<HTMLDivElement>(null);
  const holdInInput = useCallback(
    (file: File | null) => {
      const input = rootRef.current?.querySelector<HTMLInputElement>(
        `input[type="file"][name="${name}"]`
      );
      if (!input) {
        return;
      }
      const held = new DataTransfer();
      if (file) {
        held.items.add(file);
      }
      input.files = held.files;
    },
    [name]
  );
  return { holdInInput, rootRef };
};

/** An object URL for `file` while it is shown, revoked after. */
const useObjectUrl = (file: File | null) => {
  const url = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => (url ? URL.revokeObjectURL(url) : undefined), [url]);
  return url;
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
 * browser), and Use keeps the square both in the field and in its file
 * input, named as the field, so the form's post sends it. The picture in use
 * is listed under the area: Crop again reopens the same original, the X
 * removes it. A file too large, or one it cannot read, is refused in the
 * field's error line. Given the picture a User already holds (`current`), it
 * lists that one while no file is picked: removing a new pick goes back to
 * it, and removing it posts `removedName`, so the form's action tells
 * "unchanged", "new" and "removed" apart.
 */
export const AOFAvatarField = ({
  cropProps,
  current,
  label,
  labels,
  removedName,
  triggerProps,
}: AOFAvatarFieldProps) => {
  const field = useFieldContext<File | null>();
  const [original, setOriginal] = useState<File | null>(null);
  const [pickedName, setPickedName] = useState("");
  const [cropping, setCropping] = useState(false);
  const [preparing, setPreparing] = useState(false);
  const [refusal, setRefusal] = useState<string | null>(null);
  // The current picture removed; a new pick then replaces nothing.
  const [removed, setRemoved] = useState(false);
  const { holdInInput, rootRef } = useHeldFile(field.name);
  const errorId = useId();
  const preview = useObjectUrl(field.state.value);
  const originalUrl = useObjectUrl(original);
  const errors = useFieldErrors(field, refusal);

  const refuse = useCallback(
    (_: File, message: string) => {
      setRefusal(message);
      holdInInput(field.state.value);
    },
    [field.state.value, holdInInput]
  );
  const accept = useCallback(
    async (file: File) => {
      holdInInput(field.state.value);
      setPreparing(true);
      const drawable = await heicToJpeg(file).catch(() => null);
      setPreparing(false);
      if (!(drawable && (await canDraw(drawable)))) {
        setRefusal(labels.unreadable);
        return;
      }
      setRefusal(null);
      setOriginal(drawable);
      setPickedName(file.name);
      setCropping(true);
    },
    [field.state.value, holdInInput, labels.unreadable]
  );
  const use = useCallback(
    (file: File) => {
      setCropping(false);
      field.handleChange(file);
      holdInInput(file);
    },
    [field, holdInInput]
  );
  const cancel = useCallback(() => setCropping(false), []);
  const cropAgain = useCallback(() => setCropping(true), []);
  const remove = useCallback(() => {
    if (!field.state.value) {
      setRemoved(true);
      return;
    }
    field.handleChange(null);
    setOriginal(null);
    setRefusal(null);
    holdInInput(null);
  }, [field, holdInInput]);

  const items = heldItems({
    cropAgain: original ? cropAgain : null,
    cropAgainLabel: labels.cropAgain,
    current:
      current && !removed ? { label: labels.current, src: current } : null,
    pickedName,
    preview,
    value: field.state.value,
  });

  return (
    <AOFField data-invalid={errors.length > 0 || undefined} role="none">
      <AOFFieldLabel className="font-bold">{label}</AOFFieldLabel>
      <AOFFileUpload
        accept={IMAGE.INPUT_ACCEPT}
        aria-describedby={errors.length > 0 ? errorId : undefined}
        busy={preparing}
        icon={
          <IconPhotoSquareRounded
            aria-hidden
            className="size-5 text-muted-foreground"
          />
        }
        items={items}
        label={label}
        labels={{
          busy: labels.preparing,
          change: labels.change,
          choose: labels.choose,
          drop: labels.drop,
          formats: labels.formats,
          remove: labels.remove,
          tooLarge: labels.tooLarge,
        }}
        maxBytes={AVATAR.INPUT_BYTES}
        name={field.name}
        onFileAccept={accept}
        onFileReject={refuse}
        onRemove={remove}
        ref={rootRef}
        triggerProps={triggerProps}
      />
      {removedName && removed && !field.state.value ? (
        <input name={removedName} type="hidden" value="true" />
      ) : null}
      <div className="min-h-6">
        <AOFFieldError errors={errors} id={errorId} />
      </div>
      {originalUrl ? (
        <AOFAvatarCropDialog
          {...cropProps}
          labels={labels}
          onCancel={cancel}
          onUse={use}
          open={cropping}
          src={originalUrl}
        />
      ) : null}
    </AOFField>
  );
};
