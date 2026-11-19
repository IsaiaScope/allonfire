import { fileURLToPath } from "node:url";
import { safeAreaSuite } from "@allonfire/ui/features/app/tests/e2e/safe-area-suite";
import { SECTIONS } from "../src/shared/constants/laura";
import { signInAsAdmin } from "./pages";

safeAreaSuite({
  // Laura has no page with a param yet: only the catch-all.
  address: { "/[...rest]": () => "/no-such-page" },
  appDir: fileURLToPath(new URL("../src/app", import.meta.url)),
  firstSection: SECTIONS[0].path,
  signedIn: signInAsAdmin,
});
