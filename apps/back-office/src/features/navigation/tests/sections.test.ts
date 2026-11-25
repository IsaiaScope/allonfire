// @module-tag unit
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sectionGuards } from "@allonfire/ui/features/navigation/tests/section-guards";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { SECTION } from "../constants/sections";

describe("Sections", () => {
  it("lists the Sections in menu order", () => {
    expect(SECTION.LIST).toEqual([
      SECTION.HOME,
      SECTION.USERS,
      SECTION.STORAGE,
      SECTION.SERVICES,
    ]);
  });

  sectionGuards({
    navigation: { en: EN.Navigation, it: IT.Navigation },
    sections: SECTION.LIST,
    signedInDir: join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../app/[locale]/(signed-in)"
    ),
  });
});
