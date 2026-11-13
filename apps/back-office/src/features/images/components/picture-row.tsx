"use client";

import { formatSize } from "@allonfire/core/shared/utils/format-size";
import type { App } from "@allonfire/database/enums";
import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import { AOFCardContent } from "@allonfire/ui/shared/components/aof-card";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import { IconPhoto, IconTrashX } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CardFrame } from "@/shared/components/card-frame";
import {
  ToolbarActionBody,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import { IMAGES } from "../constants/images";
import type { AddImageForm } from "../hooks/use-add-image-form";
import type { AddImageRowValues } from "../utils/add-image-schema";
import { ImageAltFields } from "./image-alt-fields";
import { ImageFact, ImageFacts, ImageName } from "./image-facts";
import { ImageAccessRow, ImageAppsRow } from "./image-form-parts";

/** What stands where a fact is not known (a picture the browser cannot decode has no dimensions). */
const UNKNOWN = "—";

/** What stands where a picture the browser cannot draw would (Chrome has no HEIC): a tile, never a broken-image icon. */
const PreviewFallback = () => (
  <span
    aria-hidden
    className="flex size-36 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground *:size-9"
    data-testid="preview-fallback"
  >
    <IconPhoto />
  </span>
);

/** A just-picked file's preview, a local link freed when the row goes. */
const RowPreview = ({
  file,
  onSize,
}: {
  file: File;
  /** The picture's own size, once the browser has drawn it. */
  onSize: (width: number, height: number) => void;
}) => {
  const [src, setSrc] = useState<string | null>(null);
  const [broken, setBroken] = useState(false);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setSrc(url);
    setBroken(false);
    return () => URL.revokeObjectURL(url);
  }, [file]);
  const fail = useCallback(() => setBroken(true), []);
  const loaded = useCallback(
    ({
      currentTarget,
    }: {
      currentTarget: { naturalHeight: number; naturalWidth: number };
    }) => onSize(currentTarget.naturalWidth, currentTarget.naturalHeight),
    [onSize]
  );
  if (broken) {
    return <PreviewFallback />;
  }
  return src ? (
    <AOFImage
      alt=""
      className="size-36 shrink-0 rounded-md bg-muted object-contain"
      height={144}
      onError={fail}
      onLoad={loaded}
      sizes="144px"
      src={src}
      unoptimized
      width={144}
    />
  ) : (
    <span aria-hidden className="size-36 shrink-0 rounded-md bg-muted" />
  );
};

/** The file a row carries, posted as its own `file` part (a browser sets a file input's files only by code). */
const RowFile = ({ file, name }: { file: File; name: string }) => {
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const transfer = new DataTransfer();
    transfer.items.add(file);
    if (ref.current) {
      ref.current.files = transfer.files;
    }
  }, [file]);
  return <input hidden name={name} ref={ref} tabIndex={-1} type="file" />;
};

/** One picked file: its preview, name and size, its alt, access and Apps, and a way to drop it. */
export const PictureRow = ({
  form,
  index,
  offered,
  row,
}: {
  form: AddImageForm;
  index: number;
  offered: readonly App[];
  row: AddImageRowValues;
}) => {
  const t = useTranslations("Images.add");
  const column = useTranslations("Images.column");
  const [size, setSizeState] = useState<{
    height: number;
    width: number;
  } | null>(null);
  const setSize = useCallback(
    (width: number, height: number) => setSizeState({ height, width }),
    []
  );
  const dimensions = size ? `${size.width} × ${size.height}` : UNKNOWN;
  const titleId = useId();
  const remove = useCallback(
    () => form.removeFieldValue("rows", index),
    [form, index]
  );
  const fields = `rows[${index}]` as const;
  const removeLabel = t("row.remove", { name: row.file.name });
  return (
    <CardFrame aria-labelledby={titleId} kanji={IMAGES.ADD_KANJI} role="group">
      <AOFCardContent className="flex flex-col gap-6">
        {/* The group's name, for a screen reader: the picture's own name is the title on screen. */}
        <span className="sr-only" id={titleId}>
          {t("row.title", { number: index + 1 })}
        </span>
        <RowFile file={row.file} name={`${fields}.file`} />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 @2xl:flex-row flex-col @2xl:gap-6 gap-4">
            <RowPreview file={row.file} onSize={setSize} />
            <ImageFacts className="w-full @2xl:max-w-xl max-w-sm">
              <ImageFact
                className="col-span-2"
                label={column("name")}
                mono={false}
              >
                <ImageName>{row.file.name}</ImageName>
              </ImageFact>
              <ImageFact label={column("size")}>
                {formatSize(row.file.size)}
              </ImageFact>
              <ImageFact label={column("dimensions")}>{dimensions}</ImageFact>
            </ImageFacts>
          </div>
          <AOFButton
            aria-label={removeLabel}
            className={toolbarActionClass("icon", "destructive")}
            onClick={remove}
            type="button"
          >
            <ToolbarActionBody
              icon={<IconTrashX aria-hidden />}
              kanjiProps={{ kanji: IMAGES.DELETE_KANJI }}
              label={removeLabel}
              shape="icon"
            />
          </AOFButton>
        </div>
        <div className="grid @2xl:grid-cols-2 grid-cols-1 @2xl:gap-x-6">
          <div className="flex flex-col">
            <ImageAltFields fields={fields} form={form} />
          </div>
          <div className="flex flex-col gap-8">
            <ImageAccessRow fields={fields} form={form} />
            <ImageAppsRow fields={fields} form={form} offered={offered} />
          </div>
        </div>
      </AOFCardContent>
    </CardFrame>
  );
};
