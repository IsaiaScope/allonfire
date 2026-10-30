import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { routing } from "@/features/i18n/routing";
import {
  type ShareImageProps,
  shareImage,
} from "@/features/metadata/utils/share-image";

// Next reads each metadata file's exports from that file, so this one and
// its twin (Open Graph, X) hold the same lines over one shared card.
export const size = METADATA.SHARE_IMAGE.SIZE;
export const contentType = HTTP.CONTENT_TYPE.PNG;

// One image per language, built at build time.
export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));

const Image = (props: ShareImageProps) => shareImage(props);

export default Image;
