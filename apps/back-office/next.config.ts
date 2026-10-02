import { withStorageImages } from "@allonfire/storage/next/with-storage-images";
import { AOFCreateNextConfig } from "@allonfire/utils/next/config/aof-create-next-config";
import { buildEnv } from "./src/environment/build-environment";

// Turbopack's file cache stays on (the default). On the exFAT drive macOS writes
// a `._*` sidecar next to each cache file and Turbopack fails to open the cache,
// so `dev` and `build` delete them under `.next` first; a no-op elsewhere.
export default AOFCreateNextConfig(
  withStorageImages({}, { origin: buildEnv.STORAGE_ENDPOINT }),
  {
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
