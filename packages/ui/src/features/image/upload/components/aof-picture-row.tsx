"use client";

import { formatSize } from "@allonfire/core/shared/utils/format-size";
import type { ImageAccess } from "@allonfire/database/enums";
import { IconPhoto } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AOFCardContent } from "../../../../shared/components/aof-card";
import { AOFImage } from "../../../../shared/components/aof-image";
import { heicToJpeg, isHeic } from "../../../../shared/utils/heic-to-jpeg";
import { cn } from "../../../../shared/utils/utils";
import type { AddImagesForm } from "../hooks/use-add-images-form";
import type {
  AOFAddImagesApps,
  AOFAddImagesDressing,
} from "../types/add-images-dressing";
import type { AddImageRowValues } from "../utils/add-image-schema";
import { hasImageChoices } from "../utils/add-images-layout";
import { AOFImageAccessRow } from "./aof-image-access-row";
import { AOFImageAltFields } from "./aof-image-alt-fields";
import { AOFImageAppsRow } from "./aof-image-apps-row";
import { AOFImageFact, AOFImageFacts, AOFImageName } from "./aof-image-facts";

/** What stands where a fact is not known (a picture the browser cannot decode has no dimensions). */
const UNKNOWN = "—";

/** What stands where a picture the browser cannot draw would: a tile, never a broken-image icon. */
const PreviewFallback = () => (
  <span
    aria-hidden
    className="flex size-36 shrink-0 items-center justify-center rounded-md bg-muted/20 text-muted-foreground *:size-9"
    data-testid="preview-fallback"
  >
    <IconPhoto />
  </span>
);

/**
 * A local link to `file` as a browser draws it: a HEIC is decoded to a JPEG
 * for the link only (Chrome has no HEIC), any other file is linked as it is.
 * The link is freed when the file changes or the row goes; one that cannot be
 * made, or drawn, comes back as `broken`.
 */
const usePreviewLink = (file: File) => {
  const [preview, setPreview] = useState<{
    broken: boolean;
    src: string | null;
  }>({ broken: false, src: null });
  useEffect(() => {
    let gone = false;
    let url: string | null = null;
    setPreview({ broken: false, src: null });
    Promise.resolve(isHeic(file) ? heicToJpeg(file) : file).then(
      (source) => {
        if (!gone) {
          url = URL.createObjectURL(source);
          setPreview({ broken: false, src: url });
        }
      },
      () => {
        if (!gone) {
          setPreview({ broken: true, src: null });
        }
      }
    );
    return () => {
      gone = true;
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [file]);
  const fail = useCallback(
    () => setPreview((held) => ({ ...held, broken: true })),
    []
  );
  return { ...preview, fail };
};

/** A just-picked file's preview, a local link freed when the row goes. */
const RowPreview = ({
  file,
  onSize,
}: {
  file: File;
  /** The picture's own size, once the browser has drawn it. */
  onSize: (width: number, height: number) => void;
}) => {
  const { broken, fail, src } = usePreviewLink(file);
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
      className="size-36 shrink-0 rounded-md bg-muted/20 object-contain"
      height={144}
      onError={fail}
      onLoad={loaded}
      sizes="144px"
      src={src}
      unoptimized
      width={144}
    />
  ) : (
    <span
      aria-hidden
      className="size-36 shrink-0 rounded-md bg-muted/20 motion-safe:animate-pulse"
      data-testid="preview-loading"
    />
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

/** A row's alt, access and Apps, bound under `fields` (`rows[n]`). */
const RowFields = ({
  access,
  apps,
  choice,
  fields,
  form,
}: {
  /** Set when every Image has this access: no choice to draw. */
  access: ImageAccess | undefined;
  apps: AOFAddImagesApps;
  choice: AOFAddImagesDressing["choice"];
  fields: `rows[${number}]`;
  form: AddImagesForm;
}) => (
  <div
    className={cn(
      "grid grid-cols-1",
      hasImageChoices(access, apps) && "@2xl:grid-cols-2 @2xl:gap-x-6"
    )}
  >
    <div className="flex flex-col">
      <AOFImageAltFields fields={fields} form={form} />
    </div>
    {hasImageChoices(access, apps) ? (
      <div className="flex flex-col gap-8">
        {access === undefined ? (
          <AOFImageAccessRow fields={fields} form={form} {...choice} />
        ) : null}
        {apps.kind === "options" ? (
          <AOFImageAppsRow
            fields={fields}
            form={form}
            options={apps.options}
            {...choice}
          />
        ) : null}
      </div>
    ) : null}
  </div>
);

/** One picked file: its preview, name and size, its alt, access and Apps (where they are chosen), and a way to drop it. */
export const AOFPictureRow = ({
  access,
  apps,
  dressing: { Card, choice, Remove },
  form,
  index,
  row,
}: {
  /** Set when every Image has this access: no choice to draw. */
  access?: ImageAccess | undefined;
  apps: AOFAddImagesApps;
  dressing: Pick<AOFAddImagesDressing, "Card" | "choice" | "Remove">;
  form: AddImagesForm;
  index: number;
  row: AddImageRowValues;
}) => {
  const t = useTranslations("Common.ImageUpload");
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
  return (
    <Card aria-labelledby={titleId} role="group">
      <AOFCardContent className="flex flex-col gap-6">
        {/* The group's name, for a screen reader: the picture's own name is the title on screen. */}
        <span className="sr-only" id={titleId}>
          {t("row.title", { number: index + 1 })}
        </span>
        <RowFile file={row.file} name={`${fields}.file`} />
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 @2xl:flex-row flex-col @2xl:gap-6 gap-4">
            <RowPreview file={row.file} onSize={setSize} />
            <AOFImageFacts className="w-full @2xl:max-w-xl max-w-sm">
              <AOFImageFact
                className="col-span-2"
                label={t("facts.name")}
                mono={false}
              >
                <AOFImageName>{row.file.name}</AOFImageName>
              </AOFImageFact>
              <AOFImageFact label={t("facts.size")}>
                {formatSize(row.file.size)}
              </AOFImageFact>
              <AOFImageFact label={t("facts.dimensions")}>
                {dimensions}
              </AOFImageFact>
            </AOFImageFacts>
          </div>
          {/* Marked, so the form finds the button to move focus to when a row goes. */}
          <span className="contents" data-remove-row>
            <Remove
              label={t("row.remove", { name: row.file.name })}
              onClick={remove}
            />
          </span>
        </div>
        {/* Keyed by its index: a TanStack field keeps the name it first got, so a row that shifts up needs fields bound to its new one (else they read and write its old slot). */}
        <RowFields
          access={access}
          apps={apps}
          choice={choice}
          fields={fields}
          form={form}
          key={fields}
        />
      </AOFCardContent>
    </Card>
  );
};
