import { LOCAL } from "@allonfire/config/local/addresses";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { signInSuite } from "@allonfire/ui/features/app/tests/e2e/sign-in-suite";
import { SECTION } from "../src/features/navigation/constants/sections";
import { LAURA } from "../src/shared/constants/laura";
import { enT } from "../src/shared/tests/translators";

// A User and an Admin of Laura enter; a Back Office-only Admin and a User
// with no Membership are refused.
signInSuite({
  allowed: [FIXTURE.USER.LAURA.USER, FIXTURE.USER.LAURA.ADMIN],
  app: LAURA,
  baseUrl: LOCAL.URL.LAURA_E2E,
  homeHeading: enT(`Navigation.${SECTION.GALLERY.label}`),
  italianRefused: FIXTURE.USER.NO_MEMBERSHIP,
  refused: [FIXTURE.USER.BACK_OFFICE.ADMIN, FIXTURE.USER.NO_MEMBERSHIP],
});
