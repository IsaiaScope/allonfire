import { withProviderPictures } from "@allonfire/auth/features/next/utils/with-provider-pictures";
import { AOFCreateNextConfig } from "@allonfire/core/features/next/config/aof-create-next-config";
import { AOFWithLocalizedNotFound } from "@allonfire/core/features/next/config/aof-with-localized-not-found";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import { routing } from "./src/features/i18n/routing";

// Turbopack's file cache stays on (the default). On the exFAT drive macOS writes
// a `._*` sidecar next to each cache file and Turbopack fails to open the cache,
// so `dev` and `build` delete them under `.next` first; a no-op elsewhere.
export default AOFCreateNextConfig(
  // A URL no language owns (one with a dot, which the proxy skips) gets the
  // default language's 404 instead of Next's bare error shell. Core's own
  // routes are kept already. A sign-in provider's picture (Google's) goes
  // through the optimizer; a stored one never does (its signed link).
  AOFWithLocalizedNotFound(withProviderPictures({}), { routing }),
  {
    indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
    // next-intl reads the request config from src/features/i18n, next to the translations.
    intl: { requestConfig: "./src/features/i18n/request.ts" },
    transpile: [
      "@allonfire/auth",
      "@allonfire/database",
      "@allonfire/design",
      "@allonfire/shadcn",
      "@allonfire/storage",
      "@allonfire/ui",
    ],
  }
);
