"use client";

import { contentLanguageSchema } from "@allonfire/core/features/i18n/constants/locales";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { formatSize } from "@allonfire/core/shared/utils/format-size";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import { aofColumnHelper } from "@allonfire/ui/features/data-table/components/aof-data-table";
import { useAOFIntentPrefetch } from "@allonfire/ui/features/query/hooks/use-aof-intent-prefetch";
import { AOFBadge } from "@allonfire/ui/shared/components/aof-badge";
import { AOFStorageImage } from "@allonfire/ui/shared/components/aof-image";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva } from "class-variance-authority";
import { useLocale, useTranslations } from "next-intl";
import { useMemo } from "react";
import { Link } from "@/features/i18n/navigation";
import { APP_ENTRY } from "@/shared/constants/apps";
import { useCreated } from "@/shared/utils/use-created";
import { imageHref } from "../utils/image-href";

const helper = aofColumnHelper<ImageBody>();

/** A thumbnail's tile: 48px beside the table's alt, 96px on a phone's card. */
const thumb = cva("shrink-0 overflow-hidden rounded-md bg-muted", {
  defaultVariants: { size: "row" },
  variants: { size: { card: "size-24", row: "size-12" } },
});
const THUMB_PX = { card: 96, row: 48 } as const;

/** The content language the page speaks: the alt shows in it. */
export const useAltLanguage = () => {
  const locale = useLocale();
  const parsed = contentLanguageSchema.safeParse(locale);
  return parsed.success ? parsed.data : "en";
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
        "rounded-sm outline-none after:absolute after:inset-0 focus-visible:ring-3 focus-visible:ring-ring/50",
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
  size?: "card" | "row";
}) => {
  const language = useAltLanguage();
  return (
    <span className={thumb({ size })}>
      <AOFStorageImage
        className="size-full object-cover"
        image={image}
        language={language}
        sizes={`${THUMB_PX[size]}px`}
      />
    </span>
  );
};

/** The picture on its tile, with its alt in the page's language beside it. */
const ImageIdentity = ({ image }: { image: ImageBody }) => {
  const language = useAltLanguage();
  return (
    <span className="flex min-w-0 items-center gap-3">
      <ImageThumb image={image} />
      <span className="min-w-0 truncate text-base">
        <OpenImage image={image}>
          {image.alt[language] || image.alt.en}
        </OpenImage>
      </span>
    </span>
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
 * The picture and its alt, its dimensions in pixels, its file size in
 * megabytes, public or private, the Apps it is in, and when it was added.
 */
export const useImageColumns = () => {
  const t = useTranslations("Images.column");
  const created = useCreated();
  return useMemo(
    () =>
      helper.columns([
        helper.display({
          cell: ({ row }) => <ImageIdentity image={row.original} />,
          header: t("image"),
          id: "image",
          maxSize: 480,
          minSize: 240,
        }),
        helper.display({
          cell: ({ row }) => `${row.original.width} × ${row.original.height}`,
          header: t("dimensions"),
          id: "dimensions",
          maxSize: 160,
          minSize: 130,
        }),
        helper.display({
          cell: ({ row }) => formatSize(row.original.bytes),
          header: t("size"),
          id: "size",
          maxSize: 120,
          minSize: 100,
        }),
        helper.display({
          cell: ({ row }) => <AccessChip access={row.original.access} />,
          header: t("access"),
          id: "access",
          maxSize: 140,
          minSize: 110,
        }),
        helper.display({
          cell: ({ row }) => (
            <AppsOf apps={row.original.apps} className="truncate" />
          ),
          header: t("apps"),
          id: "apps",
          maxSize: 280,
          minSize: 140,
        }),
        helper.accessor("createdAt", {
          cell: ({ row }) => created(row.original.createdAt),
          header: t("created"),
          maxSize: 200,
          minSize: 170,
        }),
      ]),
    [created, t]
  );
};
