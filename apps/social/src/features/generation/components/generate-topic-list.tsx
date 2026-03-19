"use client";

import type { Topic } from "@allonfire/database";
import { useRouter } from "next/navigation";
import { TopicCard } from "@/features/topics/components/topic-card";
import { GenerateActions } from "./topic-card-generate-actions";

type GenerateTopicListProps = {
  topics: Topic[];
};

export function GenerateTopicList({ topics }: GenerateTopicListProps) {
  const router = useRouter();

  function handleAction() {
    router.refresh();
  }

  return (
    <div className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2">
      {topics.map((topic) => (
        <TopicCard
          key={topic.id}
          renderActions={(props) => (
            <GenerateActions {...props} onAction={handleAction} />
          )}
          topic={topic}
        />
      ))}
    </div>
  );
}
