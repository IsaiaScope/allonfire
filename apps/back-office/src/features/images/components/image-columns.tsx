"use client";

import {
  hostLanguageSchema,
  I18N,
} from "@allonfire/core/features/i18n/constants/locales";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { AOFColumnHeader } from "@allonfire/ui/features/data-table/components/aof-column-header";
import { aofColumnHelper } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useAOFIntentPrefetch } from "@allonfire/ui/features/query/hooks/use-aof-intent-prefetch";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { AOFStorageImage } from "@allonfire/ui/shared/components/aof-image";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { useLocale, useTranslations } from "next-intl";
import { type ComponentProps, useMemo } from "react";
import { Link } from "@/features/i18n/navigation";
import { CopyText } from "@/shared/components/copy-text";
import { APP_ENTRY } from "@/shared/constants/apps";
import { useCreated } from "@/shared/utils/use-created";
import { IMAGES } from "../constants/images";
import { altFor } from "../utils/image-alt";
import { imageHref } from "../utils/image-href";

const helper = aofColumnHelper<ImageBody>();

/** A thumbnail's tile: 48px beside the table's alt, 120px on a phone's card. */
// A block, so its size holds in a table cell as it did in a flex row.
const thumb = cva(
  "block shrink-0 overflow-hidden rounded-md bg-cover bg-muted",
  {
    defaultVariants: { size: "row" },
    variants: { size: { card: "size-30", page: "size-40", row: "size-12" } },
  }
);

/** The content language the page speaks: the alt shows in it. */
export const useAltLanguage = () => {
  const locale = useLocale();
  const parsed = hostLanguageSchema.safeParse(locale);
  return parsed.success ? parsed.data : I18N.DEFAULT_LANGUAGE;
};

/**
 * An Image's page, as a real link whose click area stretches over the whole
 * row or card, so a click anywhere opens it. It prefetches the page only
 * once reached for: hover, focus, or a finger landing (ADR 0028).
 */
export const OpenImage = ({
  children,
  className,
  image,
}: {
  children: React.ReactNode;
  className?: string;
  image: ImageBody;
}) => {
  const intent = useAOFIntentPrefetch();
  return (
    <Link
      {...intent}
      className={cn(
        "rounded-sm outline-none after:absolute after:inset-0 after:rounded-sm focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:after:ring-3 focus-visible:after:ring-ring/50",
        className
      )}
      href={imageHref(image.id)}
    >
      {children}
    </Link>
  );
};

/** An Image's picture on its tile, at the size the table or the card gives it. */
export const ImageThumb = ({
  image,
  size = "row",
}: {
  image: ImageBody;
  size?: "card" | "page" | "row";
}) => {
  const language = useAltLanguage();
  return (
    // The blur behind the picture: where it does not fill its square (it keeps
    // its shape) the square shows the picture's own colours, and the picture
    // itself loads over it.
    <span
      className={thumb({ size })}
      style={{ backgroundImage: `url("${image.blurDataUrl}")` }}
    >
      <AOFStorageImage
        className="size-full object-contain"
        image={image}
        language={language}
        // The Edit page's picture is its largest content, above the fold.
        lcp={size === "page"}
        // The tile paints the blur: the same before and after the picture loads.
        placeholder="empty"
        sizes={`${IMAGES.THUMB_PX[size]}px`}
      />
    </span>
  );
};

/** The picture's stored file name, copied on a click: what the storage console lists it as. */
export const CopyName = ({
  name,
  ...props
}: Omit<ComponentProps<typeof CopyText>, "labels" | "value"> & {
  name: string;
}) => {
  const t = useTranslations("Images.copy");
  return (
    <CopyText
      {...props}
      labels={{
        done: t("done"),
        failed: t("failed"),
        label: t("label", { name }),
        tip: t("tip"),
      }}
      value={name}
    />
  );
};

/** An Image's alt in the page's language, or a muted note that it has none. */
export const AltText = ({ image }: { image: ImageBody }) => {
  const t = useTranslations("Images.column");
  const language = useAltLanguage();
  const alt = altFor(image.alt, language);
  return alt ? (
    alt
  ) : (
    <span className="text-muted-foreground">{t("noAlt")}</span>
  );
};

/** Public or private, on a chip. */
export const AccessChip = ({ access }: { access: ImageAccess }) => {
  const t = useTranslations("Images.access");
  return (
    <AOFBadge
      className="h-6 px-2 text-sm"
      variant={access === ImageAccess.PUBLIC ? "default" : "outline"}
    >
      {t(access)}
    </AOFBadge>
  );
};

/** The Apps an Image is in, by name, in the enum's order: `Laura, Back Office`. */
export const AppsOf = ({
  apps,
  className,
}: {
  apps: readonly App[];
  className?: string;
}) => (
  <span className={cn("block", className)}>
    {objectValues(App)
      .filter((app) => apps.includes(app))
      .map((app) => APP_ENTRY[app].name)
      .join(SEPARATOR.NAMES)}
  </span>
);

/**
 * The picture, its stored file name (a click copies it), its alt, its dimensions in pixels, its file size in
 * megabytes, public or private, the Apps it is in, and when it was added.
 * Name, Size, Access and Created sort (the database orders by them, ADR 0031);
 * every column but the picture can hide. The
 * ids are the address's: `sort=created.desc`, `hide=size`.
 */
export const useImageColumns = () => {
  const t = useTranslations("Images.column");
  const tl = useTranslations("List.column");
  const created = useCreated();
  return useMemo(() => {
    const labels = { asc: tl("asc"), desc: tl("desc"), hide: tl("hide") };
    return helper.columns([
      helper.display({
        // The row's link lives here, in the one column that never hides, and
        // says the alt aloud: hiding the Alt column leaves the row a link. It
        // covers the row itself (an empty inline link has no box to click).
        cell: ({ row }) => (
          <>
            <ImageThumb image={row.original} />
            <OpenImage className="absolute inset-0" image={row.original}>
              <span className="sr-only">
                <AltText image={row.original} />
              </span>
            </OpenImage>
          </>
        ),
        enableHiding: false,
        enableSorting: false,
        header: t("image"),
        id: "image",
        maxSize: 96,
        minSize: 84,
      }),
      helper.accessor("key", {
        cell: ({ row }) => (
          <CopyName
            className="min-w-0 shrink font-mono text-sm"
            name={row.original.key}
          />
        ),
        header: ({ column }) => (
          <AOFColumnHeader column={column} label={t("name")} labels={labels} />
        ),
        id: "name",
        maxSize: 380,
        minSize: 220,
      }),
      helper.display({
        cell: ({ row }) => (
          <span className="block min-w-0 truncate text-base">
            <AltText image={row.original} />
          </span>
        ),
        // The database cannot order by it (a JSON column).
        enableSorting: false,
        header: ({ column }) => (
          <AOFColumnHeader column={column} label={t("alt")} labels={labels} />
        ),
        id: "alt",
        maxSize: 320,
        minSize: 160,
      }),
      helper.display({
        cell: ({ row }) => `${row.original.width} × ${row.original.height}`,
        enableSorting: false,
        header: ({ column }) => (
          <AOFColumnHeader
            column={column}
            label={t("dimensions")}
            labels={labels}
          />
        ),
        id: "dimensions",
        maxSize: 160,
        minSize: 130,
      }),
      helper.accessor("bytes", {
        cell: ({ row }) => formatSize(row.original.bytes),
        header: ({ column }) => (
          <AOFColumnHeader column={column} label={t("size")} labels={labels} />
        ),
        id: "size",
        maxSize: 120,
        minSize: 100,
      }),
      helper.accessor("access", {
        cell: ({ row }) => <AccessChip access={row.original.access} />,
        header: ({ column }) => (
          <AOFColumnHeader
            column={column}
            label={t("access")}
            labels={labels}
          />
        ),
        id: "access",
        maxSize: 140,
        minSize: 110,
      }),
      helper.display({
        cell: ({ row }) => (
          <AppsOf apps={row.original.apps} className="truncate" />
        ),
        enableSorting: false,
        header: ({ column }) => (
          <AOFColumnHeader column={column} label={t("apps")} labels={labels} />
        ),
        id: "apps",
        maxSize: 280,
        minSize: 140,
      }),
      helper.accessor("createdAt", {
        cell: ({ row }) => created(row.original.createdAt),
        header: ({ column }) => (
          <AOFColumnHeader
            column={column}
            label={t("created")}
            labels={labels}
          />
        ),
        id: "created",
        maxSize: 200,
        minSize: 170,
      }),
    ]);
  }, [created, t, tl]);
};
