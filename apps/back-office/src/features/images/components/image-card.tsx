"use client";

import { formatSize } from "@allonfire/core/shared/utils/format-size";
import type { ImageBody } from "@allonfire/storage/features/image/constants/schemas";
import {
  type AOFCard,
  AOFCardContent,
} from "@allonfire/ui/shared/components/aof-card";
import type { ComponentPropsWithoutChildren } from "@allonfire/ui/shared/types/types";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { SignCard, SignCardFoot } from "@/shared/components/sign-card";
import { IMAGES } from "../constants/images";
import {
  AccessChip,
  AppsOf,
  ImageThumb,
  OpenImage,
  useAltLanguage,
} from "./image-columns";

/**
 * An Image on a phone, as a platform sign: the line's colour along its foot
 * and 写 brushed large and faint behind, cut by its corner; its picture large
 * at the left and, to its right, its alt (cut after two lines) and whether it
 * is public or private; under both, its size, dimensions and the Apps it is
 * in, each under a small label (never joined by a middle dot); last, its
 * selection checkbox (`select`) at the left and when it was added at the right.
 */
export type ImageCardProps = ComponentPropsWithoutChildren<typeof AOFCard> & {
  image: ImageBody;
  /** Its selection checkbox. */
  select?: ReactNode;
};

/** A value under its small label, the value the heavier of the two. */
const Detail = ({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) => (
  <div className={cn("flex min-w-0 flex-col gap-0.5", className)}>
    <dt className="text-muted-foreground text-xs uppercase tracking-wider">
      {label}
    </dt>
    <dd className="font-semibold text-base">{children}</dd>
  </div>
);

export const ImageCard = ({
  className,
  image,
  select,
  ...props
}: ImageCardProps) => {
  const t = useTranslations("Images.column");
  const language = useAltLanguage();
  return (
    <SignCard className={className} kanji={IMAGES.ADD_KANJI} {...props}>
      <AOFCardContent className="flex flex-col gap-3">
        <div className="flex gap-4">
          <ImageThumb image={image} size="card" />
          <div className="flex min-w-0 flex-1 flex-col items-start gap-2">
            <OpenImage image={image}>
              <span className="wrap-break-word line-clamp-2 text-base leading-snug">
                {image.alt[language] || image.alt.en}
              </span>
            </OpenImage>
            <AccessChip access={image.access} />
          </div>
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 border-t pt-3">
          <Detail label={t("size")}>
            <span className="font-mono tabular-nums">
              {formatSize(image.bytes)}
            </span>
          </Detail>
          <Detail label={t("dimensions")}>
            <span className="font-mono tabular-nums">
              {image.width} × {image.height}
            </span>
          </Detail>
          <Detail className="col-span-2" label={t("apps")}>
            <AppsOf apps={image.apps} className="line-clamp-2" />
          </Detail>
        </dl>
        <SignCardFoot
          createdAt={image.createdAt}
          label={t("created")}
          select={select}
        />
      </AOFCardContent>
    </SignCard>
  );
};
