"use client";

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
};

/** A file the caller holds, as a row under the area. */
export type AOFFileUploadItem = {
  id: string;
  name: string;
  size: number;
  /** A picture's `blob:` URL for its thumbnail; none, and `icon` stands in. */
  preview?: string | null | undefined;
  /** What stands in for a thumbnail; a file's icon when left out. */
  icon?: ReactNode;
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
          (item.icon ?? (
            <IconFile aria-hidden className="size-5 text-muted-foreground" />
          ))
        )}
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate font-medium text-sm">{item.name}</p>
        <p className="text-muted-foreground text-xs">{sizeOf(item.size)}</p>
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

/**
 * A file upload for any form (DiceUI's File Upload, Origin UI's look): a
 * dashed drop area (a click, a drop or a paste) with what it takes and a
 * button to choose, a file over `maxBytes` refused with `tooLarge`, and the
 * files the caller holds listed under it, each with its size and a remove
 * button. It keeps no files itself: `onFileAccept` hands each one over, the
 * caller prepares it (converts, crops) and passes it back in `items`. Any
 * other prop goes to DiceUI's root (`accept`, `name`, `multiple`, `ref`).
 */
export const AOFFileUpload = ({
  busy = false,
  className,
  disabled,
  icon,
  items,
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
  const validate = useCallback(
    (file: File) => (file.size > maxBytes ? labels.tooLarge : null),
    [labels.tooLarge, maxBytes]
  );
  const held = items.length > 0 && !multiple;
  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <FileUpload
        disabled={busy || disabled}
        multiple={multiple}
        onFileValidate={validate}
        {...props}
      >
        <FileUploadDropzone
          aria-busy={busy || undefined}
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
