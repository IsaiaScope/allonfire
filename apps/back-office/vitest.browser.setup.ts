import { startMsw } from "@allonfire/config/tests/browser/msw";
import { handlers } from "./src/shared/tests/msw/handlers";

startMsw(...handlers);
