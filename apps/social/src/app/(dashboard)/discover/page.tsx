import { getDiscoveredTopics } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Compass, ExternalLink } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import {
  ArchiveTopicButton,
  SelectTopicButton,
} from "@/components/topic-actions";

const categoryColors: Record<string, string> = {
  NEWS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MEME_WORTHY: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LEARNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  TOOL_RELEASE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  AI_UPDATE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export default async function DiscoverPage() {
  const topics = await getDiscoveredTopics();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-bold text-2xl tracking-tight">Discover</h1>
          <p className="text-muted-foreground text-sm">
            Browse and select topics for content generation.
          </p>
        </div>
        {topics.length > 0 && (
          <Badge variant="secondary">
            {topics.length} topic{topics.length !== 1 ? "s" : ""}
          </Badge>
        )}
      </div>

      {topics.length === 0 ? (
        <EmptyState
          description="n8n will automatically discover trending topics and populate this feed. Check your workflow settings if this stays empty."
          icon={Compass}
          title="No topics discovered yet"
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {topics.map((topic) => (
            <Card
              className="transition-colors hover:border-primary/30"
              key={topic.id}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <CardTitle className="text-sm leading-snug">
                    {topic.title}
                  </CardTitle>
                  <a
                    aria-label="Open source"
                    className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
                    href={topic.sourceUrl}
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="size-3.5" />
                  </a>
                </div>
              </CardHeader>
              <CardContent>
                <p className="mb-3 line-clamp-2 text-muted-foreground text-sm">
                  {topic.summary}
                </p>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 font-medium text-xs ${
                      categoryColors[topic.category] ??
                      "bg-muted text-muted-foreground"
                    }`}
                  >
                    {topic.category.replace("_", " ")}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {topic.sourceName}
                  </span>
                  <span className="ml-auto text-muted-foreground/60 text-xs">
                    {topic.discoveredAt.toLocaleDateString()}
                  </span>
                </div>
                <div className="mt-3 flex gap-2 border-t pt-3">
                  <SelectTopicButton topicId={topic.id} />
                  <ArchiveTopicButton topicId={topic.id} />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
