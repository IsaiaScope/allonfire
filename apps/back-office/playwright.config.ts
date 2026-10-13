import { LOCAL } from "@allonfire/config/local/addresses";
import { aofPlaywrightConfig } from "@allonfire/config/tests/e2e";
import { App } from "@allonfire/database/enums";

export default aofPlaywrightConfig({
  app: "back-office",
  env: { AUTH_APP: App.BACK_OFFICE },
  port: LOCAL.PORT.BACK_OFFICE_E2E,
});
