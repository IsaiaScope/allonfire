import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { aofPlaywrightConfig } from "@allonfire/config/tests/e2e";
import { App } from "@allonfire/database/enums";

export default aofPlaywrightConfig({
  apiPath: API.PATH,
  app: "back-office",
  env: {
    AUTH_APP: App.BACK_OFFICE,
    // The e2e stack sets its own addresses, the App's included.
    BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE_E2E,
  },
  port: LOCAL.PORT.BACK_OFFICE_E2E,
});
