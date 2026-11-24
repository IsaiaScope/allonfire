import { AOFLogoRoute } from "@allonfire/core/features/next/metadata/utils/aof-logo-route";
import { aofLogoSvg } from "@allonfire/design/brand/aof-logo";
import { LAURA } from "@/shared/constants/laura";

// The folder METADATA.PATH.LOGO names: the logo in each layout and scheme,
// for a page's `<img>`.
export const { GET, generateStaticParams } = AOFLogoRoute((layout, scheme) =>
  aofLogoSvg({ app: LAURA.logo, layout, scheme })
);
