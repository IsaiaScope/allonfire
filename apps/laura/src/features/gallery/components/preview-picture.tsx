import type { HostLanguage } from "@allonfire/core/features/i18n/constants/locales";
import {
  AOFStorageImage,
  type AOFStorageImageProps,
} from "@allonfire/ui/shared/components/aof-image";

export type PreviewPictureProps = {
  image: AOFStorageImageProps["image"];
  language: HostLanguage;
  lcp?: boolean;
};

/**
 * One photo in the preview, as large as the slide allows with its own ratio:
 * the picture's box is the photo's shape. Next paints the blur `cover` over
 * the whole box of an Image (a class's `object-contain` is not read), so a box
 * as big as the slide showed a blurred band round the photo until it loaded,
 * then dropped it, and the photo seemed to resize. The slide is the container
 * (`cqw`, `cqh`): the width is the smaller of its width and what its height
 * allows at the ratio.
 */
export const PreviewPicture = ({
  image,
  language,
  lcp = false,
}: PreviewPictureProps) => (
  <div className="@container-size grid size-full place-items-center">
    <AOFStorageImage
      className="h-auto"
      image={image}
      language={language}
      lcp={lcp}
      placeholder="blur"
      sizes="100vw"
      style={{
        aspectRatio: `${image.width} / ${image.height}`,
        width: `min(100cqw, calc(100cqh * ${image.width / image.height}))`,
      }}
    />
  </div>
);
