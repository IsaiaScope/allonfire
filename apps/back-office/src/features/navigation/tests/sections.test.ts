// @module-tag unit
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { sectionGuards } from "@allonfire/ui/features/navigation/tests/section-guards";
import { SECTIONS } from "../constants/sections";

describe("Sections", () => {
  sectionGuards({
    sections: SECTIONS,
    signedInDir: join(
      dirname(fileURLToPath(import.meta.url)),
      "../../../app/[locale]/(signed-in)"
    ),
  });
});
