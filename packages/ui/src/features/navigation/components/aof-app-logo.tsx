import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import {
  AOF_LOGO,
  type AppLogo,
  aofLogoDataUrl,
} from "@allonfire/design/brand/aof-logo";
import { cva } from "class-variance-authority";
import { AOFImage } from "../../../shared/components/aof-image";

const { HEIGHT, WIDTH } = AOF_LOGO.LAYOUT.horizontal;
const SCHEMES = [
  METADATA.LOGO.SCHEME.LIGHT,
  METADATA.LOGO.SCHEME.DARK,
] as const;

/** The logo's width at `h-16` (64px tall, 740 by 220). */
const SIZES = "216px";

const logoImage = cva("h-16 w-auto", {
  variants: {
    shown: {
      [METADATA.LOGO.SCHEME.DARK]: "hidden dark:block",
      [METADATA.LOGO.SCHEME.LIGHT]: "dark:hidden",
    },
  },
});

type AOFAppLogoProps = {
  logo: AppLogo;
  /** The picture's alt: the App's name. */
  name: string;
  /** Draw only this scheme, always shown (a band that is always night); by default one picture per scheme. */
  scheme?: (typeof SCHEMES)[number];
};

/**
 * An App's horizontal logo, 64px tall: one picture per scheme, the theme's
 * own shown, or just `scheme`. Inlined in the HTML, so it paints with the
 * page and never waits for its own request. Every sign and band that carries
 * the logo draws it here, so the Apps' bands match.
 */
export const AOFAppLogo = ({ logo, name, scheme }: AOFAppLogoProps) =>
  (scheme ? [scheme] : SCHEMES).map((each) => (
    <AOFImage
      alt={name}
      className={logoImage({ shown: scheme ? undefined : each })}
      height={HEIGHT}
      key={each}
      sizes={SIZES}
      src={aofLogoDataUrl({
        app: logo,
        layout: METADATA.LOGO.LAYOUT.HORIZONTAL,
        scheme: each,
      })}
      width={WIDTH}
    />
  ));
