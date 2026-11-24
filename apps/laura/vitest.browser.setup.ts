// The App's own stylesheet, so a test's "visible" means what a visitor sees:
// a control drawn only by its classes (a checkbox) has no size without it.
import "./src/app/globals.css";
import { startMsw } from "@allonfire/config/tests/browser/msw";
import { handlers } from "./src/shared/tests/msw/handlers";

startMsw(...handlers);
