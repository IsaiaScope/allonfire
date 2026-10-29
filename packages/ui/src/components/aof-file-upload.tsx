"use client";

import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { UNIT } from "@allonfire/core/shared/constants/units";
import {
  FileUpload,
  FileUploadDropzone,
  FileUploadTrigger,
} from "@allonfire/shadcn/components/file-upload";
import { IconFile, IconUpload, IconX } from "@tabler/icons-react";
import { type ReactNode, useCallback } from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton, type AOFButtonPartProps } from "./aof-button";
import { AOFImage } from "./aof-image";

/** The words around the drop area and its rows, in the page's language. */
export type AOFFileUploadLabels = {
  /** The button that opens the file chooser. */
  choose: string;
  /** The same button once a single file is held; `choose` when left out. */
  change?: string | undefined;
  /** The area's title: "Drop your file here". */
  drop: string;
  /** What it takes and how large, under the title. */
  formats: string;
  /** The area's title while the caller prepares a file (`busy`). */
  busy?: string | undefined;
  /** Each row's remove button, for assistive tech. */
  remove: string;
  /** Refused: over `maxBytes`. */
  tooLarge: string;
  /** Refused: neither a type nor an extension `accept` names. */
  wrongType: string;
};

/** A file the caller holds, as a row under the area. */
export type AOFFileUploadItem = {
  id: string;
  name: string;
  /** Its size in bytes; none for a file only linked, such as a stored picture. */
  size?: number | undefined;
  /** A picture's `blob:` URL for its thumbnail; none, and a file's icon
   *  stands in. */
  preview?: string | null | undefined;
  /** More buttons before the remove one (Crop again). */
  actions?: ReactNode;
};

export type AOFFileUploadProps = Omit<
  ComponentPropsWithoutChildren<typeof FileUpload>,
  "onFileValidate"
> & {
  labels: AOFFileUploadLabels;
  /** The largest file taken, in bytes; a larger one is refused with `tooLarge`. */
  maxBytes: number;
  /** The files held, listed under the area. */
  items: readonly AOFFileUploadItem[];
  onRemove: (id: string) => void;
  /** The caller is preparing a file (converting it): the area waits. */
  busy?: boolean | undefined;
  /** The area's icon; an upload arrow when left out (a picture's field shows a picture). */
  icon?: ReactNode;
  /** The choose button, dressed by the App (variant, class, a `decoration`). */
  triggerProps?: AOFButtonPartProps | undefined;
};

/** A file's size as the page's language writes it: kB, or MB from 1 MB, in
 *  core's units (1024 bytes a kB), as the limits beside it are counted. */
const sizeOf = (bytes: number) => {
  const megabytes = bytes >= UNIT.BYTES_PER_MIB;
  const language =
    typeof document === "undefined" ? undefined : document.documentElement.lang;
  return new Intl.NumberFormat(language || undefined, {
    maximumFractionDigits: 1,
    style: "unit",
    unit: megabytes ? "megabyte" : "kilobyte",
  }).format(bytes / (megabytes ? UNIT.BYTES_PER_MIB : UNIT.BYTES_PER_KIB));
};

/** One held file: its thumbnail or icon, its name and size, then its buttons. */
const FileRow = ({
  item,
  removeLabel,
  onRemove,
}: {
  item: AOFFileUploadItem;
  removeLabel: string;
  onRemove: (id: string) => void;
}) => {
  const remove = useCallback(() => onRemove(item.id), [item.id, onRemove]);
  return (
    <li className="flex items-center gap-3 rounded-lg border bg-background p-2 pe-1">
      <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-md bg-muted">
        {item.preview ? (
          // A `blob:` URL: next/image shows it as it is, unoptimized.
          <AOFImage
            alt=""
            className="size-full object-cover"
            height={40}
            sizes="40px"
            src={item.preview}
            unoptimized
            width={40}
          />
        ) : (
          <IconFile aria-hidden className="size-5 text-muted-foreground" />
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-medium text-sm">{item.name}</p>
        {item.size === undefined ? null : (
          <p className="text-muted-foreground text-xs">{sizeOf(item.size)}</p>
        )}
      </div>
      {item.actions}
      <AOFButton
        aria-label={removeLabel}
        onClick={remove}
        size="icon"
        type="button"
        variant="ghost"
      >
        <IconX aria-hidden />
      </AOFButton>
    </li>
  );
};

/** What `accept` names, lowercased: types (`image/png`, `image/*`) and
 *  extensions (`.heic`). */
const acceptedOf = (accept: string | undefined) =>
  accept?.split(SEPARATOR.LIST).map((entry) => entry.trim().toLowerCase()) ??
  [];

/**
 * Why `file` is refused, in the caller's words, or null: a type or an
 * extension `accept` does not name, whatever the extension's case (an
 * iPhone's `IMG_0001.HEIC`, which some browsers hand over with no type),
 * else a size over `maxBytes`. DiceUI's own check is case-sensitive and
 * answers in English, so this one runs first.
 */
export const fileRefusal = (
  {
    accept,
    labels,
    maxBytes,
  }: {
    accept?: string | undefined;
    labels: AOFFileUploadLabels;
    maxBytes: number;
  },
  file: File
): string | null => {
  const type = file.type.toLowerCase();
  const extension = `.${file.name.split(".").pop()?.toLowerCase()}`;
  const accepted = acceptedOf(accept);
  const takes =
    accepted.length === 0 ||
    accepted.some(
      (entry) =>
        entry === type ||
        entry === extension ||
        (entry.endsWith("/*") && type.startsWith(entry.slice(0, -1)))
    );
  if (!takes) {
    return labels.wrongType;
  }
  return file.size > maxBytes ? labels.tooLarge : null;
};

/** `accept` with each extension in capitals too, for DiceUI's own check,
 *  which a file `fileRefusal` took must pass. */
const acceptBothCases = (accept: string | undefined) =>
  accept &&
  acceptedOf(accept)
    .flatMap((entry) =>
      entry.startsWith(".") ? [entry, entry.toUpperCase()] : [entry]
    )
    .join(SEPARATOR.LIST);

/**
 * A file upload for any form (DiceUI's File Upload, Origin UI's look): a
 * dashed drop area (a click, a drop or a paste) with what it takes and a
 * button to choose, a file `accept` does not name refused with `wrongType`,
 * one over `maxBytes` with `tooLarge` (`fileRefusal`), and the
 * files the caller holds listed under it, each with its size and a remove
 * button. It keeps no files itself: `onFileAccept` hands each one over, the
 * caller prepares it (converts, crops) and passes it back in `items`. Any
 * other prop goes to DiceUI's root (`accept`, `name`, `multiple`, `ref`).
 */
export const AOFFileUpload = ({
  accept,
  "aria-describedby": describedBy,
  busy = false,
  className,
  disabled,
  icon,
  items,
  label,
  labels,
  maxBytes,
  multiple,
  onRemove,
  triggerProps: {
    decoration,
    className: triggerClassName,
    ...triggerProps
  } = {},
  ...props
}: AOFFileUploadProps) => {
  const validate = (file: File) =>
    fileRefusal({ accept, labels, maxBytes }, file);
  const held = items.length > 0 && !multiple;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FileUpload
        accept={acceptBothCases(accept)}
        disabled={busy || disabled}
        label={label}
        multiple={multiple}
        onFileValidate={validate}
        {...props}
      >
        {/* The one stop a keyboard reaches, so it carries the name and
            what the field says (its error). */}
        <FileUploadDropzone
          aria-busy={busy || undefined}
          aria-describedby={describedBy}
          aria-label={label}
          // The whole area opens the chooser, not only its button.
          className="min-h-52 cursor-pointer gap-0 rounded-lg border border-input border-dashed px-4 py-6 text-center"
        >
          <div className="mb-3 flex size-11 items-center justify-center rounded-md border bg-background">
            {icon ?? (
              <IconUpload
                aria-hidden
                className="size-5 text-muted-foreground"
              />
            )}
          </div>
          <p className="font-medium text-sm">
            {busy && labels.busy ? labels.busy : labels.drop}
          </p>
          <p className="mt-1 text-muted-foreground text-xs">{labels.formats}</p>
          <FileUploadTrigger
            render={
              <AOFButton
                className={cn("mt-4", triggerClassName)}
                type="button"
                variant="outline"
                {...triggerProps}
              />
            }
          >
            {decoration}
            <IconUpload aria-hidden />
            {held && labels.change ? labels.change : labels.choose}
          </FileUploadTrigger>
        </FileUploadDropzone>
      </FileUpload>
      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <FileRow
              item={item}
              key={item.id}
              onRemove={onRemove}
              removeLabel={labels.remove}
            />
          ))}
        </ul>
      ) : null}
    </div>
  );
};
