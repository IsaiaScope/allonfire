/**
 * Programmatic image generation using Satori.
 * Generates social media cards, code slides, and news graphics.
 *
 * TODO: Implement when ready to add visual content generation.
 * - News cards: headline + key visual + source attribution
 * - Learning slides: code before/after comparisons
 * - Meme templates: image with caption overlay
 */

export function generateCard(_options: {
  title: string;
  subtitle?: string;
  style: "news" | "learning" | "meme";
}): Buffer {
  throw new Error("Not implemented yet — install satori and @resvg/resvg-js");
}
