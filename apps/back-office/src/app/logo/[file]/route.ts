import { AOFLogoRoute } from "@allonfire/core/features/next/metadata/aof-logo-route";
import { aofLogoSvg } from "@allonfire/design/brand/aof-logo";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The folder METADATA.PATH.LOGO names: the logo in each layout and scheme,
// for a page's `<img>`.
export const { GET, generateStaticParams } = AOFLogoRoute((layout, scheme) =>
  aofLogoSvg({ app: BACK_OFFICE.LOGO, layout, scheme })
);
