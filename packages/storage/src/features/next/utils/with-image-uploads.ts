import type { NextConfig } from "next";
import { IMAGE } from "../../image/constants/image";

/**
 * An App's Next config, able to take a whole Images upload. A form posts up
 * to the API's whole upload (`IMAGE.LIMIT.UPLOAD.BYTES`) through a Server
 * Action, whose body Next caps at 1 MB unless told, and the proxy buffers a
 * body only up to 10 MB: past that the form arrives cut off ("Unexpected end
 * of form"). Both limits become `IMAGE.LIMIT.UPLOAD.BODY_BYTES`; every other
 * `experimental` and `serverActions` setting the App has stays.
 */
export const withImageUploads = (config: NextConfig): NextConfig => ({
  ...config,
  experimental: {
    ...config.experimental,
    proxyClientMaxBodySize: IMAGE.LIMIT.UPLOAD.BODY_BYTES,
    serverActions: {
      ...config.experimental?.serverActions,
      bodySizeLimit: IMAGE.LIMIT.UPLOAD.BODY_BYTES,
    },
  },
});
