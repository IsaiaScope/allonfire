"use client";

import type { Prompt, Topic } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { cn } from "@allonfire/ui/lib/utils";
import { m } from "framer-motion";
import { useRouter } from "next/navigation";
import { TopicCard } from "@/features/topics/components/topic-card";
import { getCategoryColor } from "@/features/topics/components/topic-utils";
import { fadeInUp, staggerContainer } from "@/lib/animation-variants";
import { GenerateActions } from "./topic-card-generate-actions";

type TopicWithPrompts = Topic & { prompts: Prompt[] };

type GenerateTopicListProps = {
  topics: TopicWithPrompts[];
};

export function GenerateTopicList({ topics }: GenerateTopicListProps) {
  const router = useRouter();

  function handleAction() {
    router.refresh();
  }

  return (
    <m.div
      animate="visible"
      className="grid grid-cols-1 items-start gap-3 lg:grid-cols-2"
      initial="hidden"
      variants={staggerContainer}
    >
      {topics.map((topic) => (
        <m.div key={topic.id} variants={fadeInUp}>
          <TopicCard
            onClick={() => router.push(`/generate/${topic.id}`)}
            renderActions={(props) => (
              <GenerateActions {...props} onAction={handleAction} />
            )}
            renderMetaEnd={
              <Badge
                className={cn("ml-auto", getCategoryColor(topic.category))}
                variant="secondary"
              >
                {topic.prompts.length}{" "}
                {topic.prompts.length === 1 ? "prompt" : "prompts"}
              </Badge>
            }
            topic={topic}
          />
        </m.div>
      ))}
    </m.div>
  );
}
