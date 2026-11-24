import { GALLERY } from "../constants/gallery";

/**
 * How many grid rows a photo's tile spans: its height beside its width, in
 * `GALLERY.GRID.PRECISION`ths of a column. Whole rows (about 1% off the ratio
 * at 40, hidden by `object-cover`), never fewer than one.
 */
export const tileSpan = (width: number, height: number) =>
  Math.max(1, Math.round((height / width) * GALLERY.GRID.PRECISION));
