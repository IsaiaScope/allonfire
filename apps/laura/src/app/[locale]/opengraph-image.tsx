import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { routing } from "@/features/i18n/routing";
import { shareImage } from "@/features/metadata/utils/page-information";

// jscpd:ignore-start
// Next reads `size`, `contentType` and `generateStaticParams` from each metadata image file, so Open Graph's and X's files (and the Back Office's) hold the same lines over one shared card.
export const size = METADATA.SHARE_IMAGE.SIZE;
export const contentType = HTTP.CONTENT_TYPE.PNG;

// One image per language, built at build time.
export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));
// jscpd:ignore-end

const Image = (props: Parameters<typeof shareImage>[0]) => shareImage(props);

export default Image;
