import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOF_LOGO, aofLogoDataUrl } from "@allonfire/design/brand/aof-logo";
import { AOFImage } from "@allonfire/ui/shared/components/aof-image";
import { cva } from "class-variance-authority";
import { LAURA } from "@/shared/constants/laura";

const { HEIGHT, WIDTH } = AOF_LOGO.LAYOUT.horizontal;
const SCHEMES = [
  METADATA.LOGO.SCHEME.LIGHT,
  METADATA.LOGO.SCHEME.DARK,
] as const;

const logoImage = cva("h-12 w-auto", {
  variants: {
    scheme: {
      [METADATA.LOGO.SCHEME.DARK]: "hidden dark:block",
      [METADATA.LOGO.SCHEME.LIGHT]: "dark:hidden",
    },
  },
});

/**
 * Laura's logo, one picture per scheme (the theme toggle's `.dark` shows the
 * one in force), inlined in the HTML so it paints with the page.
 */
export const LauraLogo = () =>
  SCHEMES.map((scheme) => (
    <AOFImage
      alt={LAURA.name}
      className={logoImage({ scheme })}
      height={HEIGHT}
      key={scheme}
      sizes="160px"
      src={aofLogoDataUrl({
        app: LAURA.logo,
        layout: METADATA.LOGO.LAYOUT.HORIZONTAL,
        scheme,
      })}
      width={WIDTH}
    />
  ));
