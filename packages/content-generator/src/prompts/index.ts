// biome-ignore lint/performance/noBarrelFile: prompt module entry point
export { learningPrompt } from "./learning";
export { memePrompt } from "./meme";
export { newsPrompt } from "./news";

export const PROMPT_TEMPLATES = {
  MEME: "meme",
  NEWS: "news",
  LEARNING: "learning",
} as const;
