import { HTTP } from "../../features/http/constants/http";

/**
 * An SVG as a URL-encoded data URL, which any image renderer loads (Satori
 * included). No Node `Buffer`, so a client component can build one too.
 */
export const svgDataUrl = (svg: string) =>
  `data:${HTTP.CONTENT_TYPE.SVG},${encodeURIComponent(svg)}`;
