import { type ColorScheme, METADATA } from "../../metadata/constants/metadata";
import { fileRoute } from "./file-route";
import { launchScreenFile, launchScreenVariants } from "./launch-screens";
import { type MarkImage, markImage } from "./mark-image";

/**
 * The App's `app/launch/[screen]/route.tsx` (the folder
 * `METADATA.PATH.LAUNCH_SCREEN` names) re-exports `GET` and
 * `generateStaticParams` from this; `image` says how the App's mark looks in
 * a color scheme. Each screen is that scheme's mark, centred at
 * `METADATA.LAUNCH.MARK_SHARE` of its shortest edge, built at build time.
 */
export const AOFLaunchScreenRoute = (
  image: (scheme: ColorScheme) => Promise<MarkImage>
) =>
  fileRoute(
    "screen",
    new Map(
      launchScreenVariants().map((variant) => [
        launchScreenFile(variant),
        variant,
      ])
    ),
    async ({ pixelHeight, pixelWidth, scheme }) =>
      markImage(
        { height: pixelHeight, width: pixelWidth },
        Math.min(pixelWidth, pixelHeight) * METADATA.LAUNCH.MARK_SHARE,
        await image(scheme)
      )
  );
