import type { Topic } from "@allonfire/database";

export type TopicWithPrompts = Topic & {
  prompts: { id: string; rating: string | null; ratingNote: string | null }[];
};

export type PaginatedTopicResult<T = Topic> = {
  nextCursor: string | null;
  topics: T[];
  totalCount: number | null;
};
