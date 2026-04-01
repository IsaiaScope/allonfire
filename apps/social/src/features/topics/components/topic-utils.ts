import type { TopicCategory } from "@allonfire/database";

export const categoryColors: Partial<Record<TopicCategory, string>> = {
  NEWS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MEME_WORTHY: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LEARNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  TOOL_RELEASE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  AI_UPDATE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function getCategoryColor(category: TopicCategory): string {
  return categoryColors[category] ?? "bg-muted text-muted-foreground";
}

export function formatCategory(category: TopicCategory): string {
  return category.replaceAll("_", " ");
}
