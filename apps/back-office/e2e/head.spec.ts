import { LOCAL } from "@allonfire/config/local/addresses";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { headSuite } from "@allonfire/ui/features/app/tests/e2e/head-suite";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { BACK_OFFICE } from "../src/shared/constants/back-office";

headSuite({
  app: BACK_OFFICE,
  baseUrl: LOCAL.URL.BACK_OFFICE_E2E,
  description: EN.Metadata.description,
  // The Japan Design's light --background, as the browser reports it.
  ground: "rgb(246, 247, 248)",
  indexing: METADATA.INDEXING.UNINDEXED,
});
