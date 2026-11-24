import { LOCAL } from "@allonfire/config/local/addresses";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { headSuite } from "@allonfire/ui/features/app/tests/e2e/head-suite";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { LAURA } from "../src/shared/constants/laura";

headSuite({
  app: LAURA,
  baseUrl: LOCAL.URL.LAURA_E2E,
  description: EN.Metadata.description,
  // The Ocean Design's light --background, as the browser reports it.
  ground: "rgb(242, 248, 248)",
  indexing: METADATA.INDEXING.UNINDEXED,
});
