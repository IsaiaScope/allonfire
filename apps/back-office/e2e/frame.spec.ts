import { USER } from "@allonfire/auth/features/users/constants/users";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { frameSuite } from "@allonfire/ui/features/app/tests/e2e/frame-suite";
import EN from "../src/features/i18n/translations/en.json" with {
  type: "json",
};
import { SECTION } from "../src/features/navigation/constants/sections";
import { BACK_OFFICE } from "../src/shared/constants/back-office";

frameSuite({
  admin: FIXTURE.USER.BACK_OFFICE.ADMIN,
  app: BACK_OFFICE,
  // A filtered list's address, which switching language must keep.
  languageProbe: {
    path: SECTION.USERS.path,
    query: `${USER.PARAM.SEARCH}=isa`,
  },
  navigation: EN.Navigation,
});
