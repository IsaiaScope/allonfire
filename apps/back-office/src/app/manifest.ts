import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { aofManifest } from "@allonfire/core/features/next/metadata/utils/aof-manifest";
import { JAPAN_IMAGE_COLOR } from "@allonfire/design/designs/japan/image-colors";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { metadataText } from "@/shared/constants/page-information";

const manifest = () =>
  aofManifest({
    description: metadataText(I18N.DEFAULT_LANGUAGE)("description"),
    ground: JAPAN_IMAGE_COLOR[METADATA.COLOR_SCHEME.LIGHT].background,
    name: BACK_OFFICE.name,
  });

export default manifest;
