import { getTopicsByStatusWithPrompts } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Sparkles } from "lucide-react";
import { EmptyState } from "@/components/empty-state";
import { GenerateTopicList } from "@/features/generation/components/generate-topic-list";

export default async function GeneratePage() {
  const selectedTopics = await getTopicsByStatusWithPrompts(["SELECTED"]);
  const totalPrompts = selectedTopics.reduce(
    (sum, t) => sum + t.prompts.length,
    0
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-bold text-2xl tracking-tight">Generate</h1>
          {selectedTopics.length > 0 && (
            <Badge variant="secondary">{selectedTopics.length} selected</Badge>
          )}
          {totalPrompts > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {totalPrompts === 1 ? "1 prompt" : `${totalPrompts} prompts`}
            </Badge>
          )}
        </div>
        <p className="text-muted-foreground text-sm">
          Selected topics queued for prompt generation.
        </p>
      </div>

      {selectedTopics.length === 0 ? (
        <EmptyState
          description="Select topics from the Discover page to queue them for prompt generation."
          icon={Sparkles}
          title="No topics selected"
        />
      ) : (
        <GenerateTopicList topics={selectedTopics} />
      )}
    </div>
  );
}
