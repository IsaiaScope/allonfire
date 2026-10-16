import { AOFManifestIconRoute } from "@allonfire/core/features/next/metadata/aof-icon-images";
import { iconImage } from "@/features/metadata/utils/icon-image";

// The folder METADATA.PATH.MANIFEST_ICON names: the manifest's PNGs, each
// built at build time.
export const { GET, generateStaticParams } = AOFManifestIconRoute(iconImage);
