import { getTopicWithPrompts } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GeneratePromptButton } from "@/features/generation/components/generate-prompt-button";
import { PromptList } from "@/features/generation/components/prompt-list";
import {
  formatCategory,
  getCategoryColor,
} from "@/features/topics/components/topic-utils";

type TopicDetailPageProps = {
  params: Promise<{ topicId: string }>;
};

export default async function TopicDetailPage({
  params,
}: TopicDetailPageProps) {
  const { topicId } = await params;
  const topic = await getTopicWithPrompts(topicId);

  if (!topic) {
    notFound();
  }

  return (
    <div className="space-y-3 md:space-y-5">
      <div>
        <div className="mb-2 md:mb-4">
          <Button asChild size="sm" variant="ghost">
            <Link href="/generate">
              <ArrowLeft className="size-3.5" />
              Back
            </Link>
          </Button>
        </div>

        <div className="flex items-start gap-2 md:gap-3">
          <div className="min-w-0 flex-1">
            <h1 className="line-clamp-3 font-bold text-lg leading-snug tracking-tight md:text-xl">
              {topic.title}
            </h1>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 md:mt-2 md:gap-2">
              <Badge
                className={getCategoryColor(topic.category)}
                variant="secondary"
              >
                {formatCategory(topic.category)}
              </Badge>
              <span className="text-muted-foreground text-xs">
                {topic.sourceName}
              </span>
              <span className="text-muted-foreground/60 text-xs">
                {new Date(topic.discoveredAt).toLocaleDateString()}
              </span>
            </div>
          </div>
          <a
            aria-label="Open source"
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            href={topic.sourceUrl}
            rel="noopener noreferrer"
            target="_blank"
          >
            <ExternalLink className="size-5" />
          </a>
        </div>

        <p className="mt-2 line-clamp-10 text-muted-foreground text-sm md:mt-3">
          {topic.summary}
        </p>
      </div>

      <div className="flex items-center justify-between border-t pt-3 md:pt-4">
        <h2 className="font-semibold text-lg">
          Prompts
          {topic.prompts.length > 0 && (
            <span className="ml-2 font-normal text-muted-foreground text-sm">
              ({topic.prompts.length})
            </span>
          )}
        </h2>
        <GeneratePromptButton topicId={topic.id} />
      </div>

      <PromptList prompts={topic.prompts} />
    </div>
  );
}
