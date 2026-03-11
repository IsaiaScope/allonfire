import { getTopicsByStatusWithPosts } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenerateButton } from "@/components/generate-button";

export default async function GeneratePage() {
  const selectedTopics = await getTopicsByStatusWithPosts([
    "SELECTED",
    "GENERATING",
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-bold text-2xl tracking-tight">Generate</h1>
        <p className="text-muted-foreground text-sm">
          Selected topics queued for content generation.
        </p>
      </div>

      {selectedTopics.length === 0 ? (
        <EmptyState
          description="Select topics from the Discover page to queue them for content generation."
          icon={Sparkles}
          title="No topics selected"
        />
      ) : (
        <div className="space-y-3">
          {selectedTopics.map((topic) => (
            <Card key={topic.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm">{topic.title}</CardTitle>
                  <Badge
                    className={
                      topic.status === "GENERATING" ? "animate-pulse" : ""
                    }
                    variant={
                      topic.status === "GENERATING" ? "default" : "secondary"
                    }
                  >
                    {topic.status === "GENERATING"
                      ? "Generating..."
                      : "Selected"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 text-muted-foreground text-sm">
                    <span>{topic.category.replace("_", " ")}</span>
                    <span className="size-1 rounded-full bg-muted-foreground/30" />
                    <span>
                      {topic.posts.length} post
                      {topic.posts.length !== 1 ? "s" : ""} generated
                    </span>
                  </div>
                  {topic.status === "SELECTED" && (
                    <GenerateButton topicId={topic.id} />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
