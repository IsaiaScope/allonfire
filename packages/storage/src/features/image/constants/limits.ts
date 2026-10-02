/**
 * Width times height past which an upload is refused before it is decoded:
 * 100 MP is about 300 MB of RGB, and the VPS has no swap.
 */
export const MAX_INPUT_MEGAPIXELS = 100;
export const MAX_INPUT_PIXELS = MAX_INPUT_MEGAPIXELS * 1_000_000;
