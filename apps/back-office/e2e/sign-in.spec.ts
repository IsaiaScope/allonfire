import { LOCAL } from "@allonfire/config/local/addresses";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { signInSuite } from "@allonfire/ui/features/app/tests/e2e/sign-in-suite";
import { BACK_OFFICE } from "../src/shared/constants/back-office";

signInSuite({
  allowed: [FIXTURE.USER.BACK_OFFICE.ADMIN],
  app: BACK_OFFICE,
  baseUrl: LOCAL.URL.BACK_OFFICE_E2E,
  homeHeading: BACK_OFFICE.name,
  italianRefused: FIXTURE.USER.BACK_OFFICE.USER,
  refused: [
    FIXTURE.USER.BACK_OFFICE.USER,
    FIXTURE.USER.BACK_OFFICE.VIEWER,
    FIXTURE.USER.NO_MEMBERSHIP,
  ],
});
