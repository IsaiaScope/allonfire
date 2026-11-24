import type { LauraDeps } from "../../utils/deps";
import { pageHandlers } from "../../utils/page-handlers";
import { galleryRoute } from "./routes";

/** One page of the Images placed in Laura, with the caller's own Favorite flag. */
export const galleryHandlers = (deps: LauraDeps) =>
  pageHandlers(galleryRoute, deps, deps.listGalleryPage);
