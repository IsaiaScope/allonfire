import { AOFLaunchScreenRoute } from "@allonfire/core/features/next/metadata/utils/aof-launch-screen-route";
import { launchScreen } from "@/features/metadata/utils/page-information";

// The folder METADATA.PATH.LAUNCH_SCREEN names: one PNG per device,
// orientation and color scheme, built at build time: the logo in the
// scheme's colours on the scheme's ground.
export const { GET, generateStaticParams } = AOFLaunchScreenRoute(launchScreen);
