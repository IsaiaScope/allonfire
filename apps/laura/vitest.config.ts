import { fileURLToPath } from "node:url";
import { aofAppVitest } from "@allonfire/config/tests/vitest/app";

const app = aofAppVitest(fileURLToPath(new URL("./src", import.meta.url)));

/** The browser config wears the same alias and JSX settings. */
export const { appViteOptions } = app;
export default app.vitestConfig;
