import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofManifest } from "@allonfire/core/features/next/metadata/utils/aof-manifest";
import { OCEAN_IMAGE_COLOR } from "@allonfire/design/designs/ocean/image-colors";
import { metadataText } from "@/features/metadata/utils/page-information";
import { LAURA } from "@/shared/constants/laura";

const manifest = () =>
  aofManifest({
    description: metadataText(I18N.DEFAULT_LANGUAGE)("description"),
    ground: OCEAN_IMAGE_COLOR[METADATA.COLOR_SCHEME.LIGHT].background,
    name: LAURA.name,
  });

export default manifest;
