import { HTTP } from "@allonfire/core/features/http/constants/http";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { iconImage } from "@/features/metadata/utils/icon-image";

const { edge } = METADATA.ICON.APPLE;
export const size = { height: edge, width: edge };
export const contentType = HTTP.CONTENT_TYPE.PNG;

// iOS prefers this over the manifest's icons, rounds the corners itself and
// fills transparency with black: an opaque ground, the logo inset.
const AppleIcon = () => iconImage(METADATA.ICON.APPLE);

export default AppleIcon;
