import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofLogoSvg } from "@allonfire/design/brand/aof-logo";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The tab icon: the Back Office's logo as SVG, sharp at any size, light or
// dark with the viewer's theme.
export const contentType = HTTP.CONTENT_TYPE.SVG;

const Icon = () =>
  new Response(
    aofLogoSvg({
      app: BACK_OFFICE.LOGO,
      layout: METADATA.LOGO.LAYOUT.SQUARE,
      scheme: METADATA.LOGO.SCHEME.AUTO,
    }),
    { headers: { [HTTP.HEADER.CONTENT_TYPE]: contentType } }
  );

export default Icon;
