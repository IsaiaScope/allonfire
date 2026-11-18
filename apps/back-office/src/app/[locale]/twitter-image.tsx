import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { routing } from "@/features/i18n/routing";
import { shareImage } from "@/shared/constants/page-information";

// jscpd:ignore-start
// Next reads each metadata file's exports from that file, so this one and
// its twin (Open Graph, X) hold the same lines over one shared card.
export const size = METADATA.SHARE_IMAGE.SIZE;
export const contentType = HTTP.CONTENT_TYPE.PNG;

// One image per language, built at build time.
export const generateStaticParams = () =>
  routing.locales.map((locale) => ({ locale }));
// jscpd:ignore-end

const Image = (props: Parameters<typeof shareImage>[0]) => shareImage(props);

export default Image;
