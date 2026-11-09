import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { aofPlaywrightConfig } from "@allonfire/config/tests/e2e";
import { PWA } from "@allonfire/core/features/next/pwa/constants/pwa";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { App } from "@allonfire/database/enums";

export default aofPlaywrightConfig({
  apiPath: API.PATH,
  app: "back-office",
  env: {
    AUTH_APP: App.BACK_OFFICE,
    // The e2e stack sets its own addresses, the App's included.
    BACK_OFFICE_URL: LOCAL.URL.BACK_OFFICE_E2E,
  },
  // The Install hint shows from a visitor's second page on and, on a phone,
  // covers a form's button: every e2e visitor has dismissed it already.
  localStorage: [
    {
      name: PWA.INSTALL_HINT.STORAGE_KEY.DISMISSED,
      value: stringifyJson(Date.now()),
    },
  ],
  port: LOCAL.PORT.BACK_OFFICE_E2E,
});
