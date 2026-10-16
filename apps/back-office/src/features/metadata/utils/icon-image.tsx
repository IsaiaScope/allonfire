import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFIconImage } from "@allonfire/core/features/next/metadata/aof-icon-images";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { AOFBrandLogo } from "@allonfire/ui/components/aof-brand-logo";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { imageFonts } from "./image-fonts";

/**
 * A square icon PNG of the Back Office's logo: the apple-touch-icon and the
 * manifest's icons. Dark, since no icon follows the viewer's theme.
 */
export const iconImage = async (icon: { edge: number; inset: number }) =>
  AOFIconImage(icon, {
    fonts: await imageFonts(),
    ground: BRAND.GROUND,
    mark: (edge) => (
      <AOFBrandLogo
        app={BACK_OFFICE.LOGO}
        height={edge}
        layout={METADATA.LOGO.LAYOUT.SQUARE}
        scheme={METADATA.COLOR_SCHEME.DARK}
      />
    ),
  });
