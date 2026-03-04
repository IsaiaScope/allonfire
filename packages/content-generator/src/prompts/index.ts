// biome-ignore lint/performance/noBarrelFile: prompt module entry point
export { learningPrompt } from "./learning.js";
export { memePrompt } from "./meme.js";
export { newsPrompt } from "./news.js";

export const PROMPT_TEMPLATES = {
  MEME: "meme",
  NEWS: "news",
  LEARNING: "learning",
} as const;
