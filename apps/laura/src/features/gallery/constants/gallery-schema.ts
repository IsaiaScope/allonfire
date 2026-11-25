import { z } from "zod";
import { GALLERY } from "./gallery";

const gallerySourceSchema = z.enum(GALLERY.SOURCE);

/** Which list a feed shows: every photo placed in Laura, or the Favorites. */
export type GallerySource = z.infer<typeof gallerySourceSchema>;
