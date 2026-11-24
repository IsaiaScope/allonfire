import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { frameSuite } from "@allonfire/ui/features/app/tests/e2e/frame-suite";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { LAURA, SECTION } from "../src/shared/constants/laura";

// Memory's sub-menu is walked by the suite: Play marked on `/memory`,
// Leaderboard on `/memory/leaderboard`.
frameSuite({
  admin: FIXTURE.USER.LAURA.ADMIN,
  app: LAURA,
  languageProbe: { path: SECTION.FAVORITES.path, query: "" },
  navigation: EN.Navigation,
});
