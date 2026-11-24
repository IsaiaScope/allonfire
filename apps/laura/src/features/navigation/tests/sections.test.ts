// @module-tag unit
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sectionGuards } from "@allonfire/ui/features/navigation/tests/section-guards";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { SECTIONS } from "@/shared/constants/laura";

describe("Sections", () => {
  sectionGuards({
    navigation: { en: EN.Navigation, it: IT.Navigation },
    sections: SECTIONS,
    signedInDir: join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../app/[locale]/(signed-in)"
    ),
  });
});
