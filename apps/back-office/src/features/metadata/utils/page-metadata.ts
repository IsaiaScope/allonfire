import { AOFPageMetadata } from "@allonfire/core/features/next/metadata/aof-page-metadata";
import { pageOpenGraph } from "./page-open-graph";

/**
 * A Back Office page's metadata: its path and its title, as a translation's
 * full key (`"Users.add.title"`), with the Back Office's own link preview.
 */
export const pageMetadata = AOFPageMetadata(pageOpenGraph);
