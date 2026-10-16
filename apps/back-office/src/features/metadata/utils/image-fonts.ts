import { loadJapanImageFonts } from "@allonfire/design/designs/japan/image-fonts";
import { cacheLife } from "next/cache";

/**
 * The fonts every generated image draws with. Cached, because Cache
 * Components rejects a route that reads a file on demand; for the longest
 * life, because the fonts change only with a deploy, and a shorter one
 * would re-render every prerendered image when it ran out.
 */
export const imageFonts = async () => {
  "use cache";
  cacheLife("max");
  return await loadJapanImageFonts();
};
