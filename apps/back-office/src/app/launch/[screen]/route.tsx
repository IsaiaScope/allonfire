import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFLaunchScreenRoute } from "@allonfire/core/features/next/metadata/aof-launch-screen-route";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { AOFBrandLogo } from "@allonfire/ui/components/aof-brand-logo";
import { imageFonts } from "@/features/metadata/utils/image-fonts";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The folder METADATA.PATH.LAUNCH_SCREEN names: one PNG per device,
// orientation and color scheme, built at build time: the logo in the
// scheme's colours on the scheme's ground.
export const { GET, generateStaticParams } = AOFLaunchScreenRoute(
  async (scheme) => ({
    fonts: await imageFonts(),
    ground: JAPAN_IMAGE_COLOR[scheme].background,
    mark: (edge) => (
      <AOFBrandLogo
        app={BACK_OFFICE.LOGO}
        height={edge}
        layout={METADATA.LOGO.LAYOUT.SQUARE}
        rounded
        scheme={scheme}
      />
    ),
  })
);
