// @module-tag unit
import { API } from "@allonfire/api/shared/constants/api";
import { environmentSuite } from "@allonfire/config/tests/vitest/environment-suite";
import { App } from "@allonfire/database/enums";

environmentSuite({
  addresses: ["BACK_OFFICE_URL", "LAURA_URL"],
  authApp: App.BACK_OFFICE,
  authPath: API.PATH.AUTH,
  examplePath: new URL("../../../.env.example", import.meta.url),
  importEnv: () => import("../environment"),
});
