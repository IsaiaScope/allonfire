// @module-tag unit
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sectionGuards } from "@allonfire/ui/features/navigation/tests/section-guards";
import EN from "@/features/i18n/translations/en.json" with { type: "json" };
import IT from "@/features/i18n/translations/it.json" with { type: "json" };
import { LAURA } from "@/shared/constants/laura";
import { SECTION } from "../constants/sections";

describe("Sections", () => {
  sectionGuards({
    navigation: { en: EN.Navigation, it: IT.Navigation },
    sections: LAURA.sections,
    signedInDir: join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../app/[locale]/(signed-in)"
    ),
  });
});

describe("SECTION", () => {
  it("lists the menu in its order, Home (the Gallery) first", () => {
    expect(SECTION.LIST).toEqual([
      SECTION.GALLERY,
      SECTION.FAVORITES,
      SECTION.MEMORY,
      SECTION.UPLOAD,
    ]);
  });

  it("is the list the App's descriptor reads", () => {
    expect(LAURA.sections).toBe(SECTION.LIST);
  });
});
