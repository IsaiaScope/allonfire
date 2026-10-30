import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { JAPAN_SHARE_CARD } from "@allonfire/design/designs/japan/share-card-look";
import { AOFShareCard } from "@allonfire/ui/components/aof-share-card";
import { ImageResponse } from "next/og";
import { imageFonts } from "@/features/metadata/utils/image-fonts";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { metadataText } from "./metadata-text";

export type ShareImageProps = { params: Promise<{ locale: string }> };

/**
 * The link-preview card, the same for Open Graph and X, in the locale of the
 * `[locale]` the image file sits under: `AOFShareCard` in the Japan Design's
 * look on the Back Office's line, its name as the headline. The head names it
 * through `baseMetadata`, alt included.
 */
export const shareImage = async ({ params }: ShareImageProps) => {
  const [{ locale }, fonts] = await Promise.all([params, imageFonts()]);
  const t = metadataText(locale);
  return new ImageResponse(
    <AOFShareCard
      {...JAPAN_SHARE_CARD[METADATA.COLOR_SCHEME.LIGHT]}
      band={BACK_OFFICE.LINE}
      description={t("description")}
      headline={BACK_OFFICE.NAME}
      logo={BACK_OFFICE.LOGO}
    />,
    { ...METADATA.SHARE_IMAGE.SIZE, fonts }
  );
};
