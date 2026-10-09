import { HTTP_METHOD } from "@allonfire/core/features/http/constants/http";

/**
 * The upload brings its own body limit and time budget (100 MiB, 5 minutes),
 * so a host skips its global ones for it. `basePath` is where it mounted the
 * module.
 */
export const isImageUpload = (
  method: string,
  path: string,
  basePath: string
): boolean => method === HTTP_METHOD.POST && path === basePath;
