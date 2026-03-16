"use client";

import type { Topic, TopicCategory } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import { Button } from "@allonfire/ui/components/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Checkbox } from "@allonfire/ui/components/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@allonfire/ui/components/collapsible";
import {
  Archive,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Sparkles,
} from "lucide-react";
import { useState, useTransition } from "react";
import { archiveTopicAction, selectTopicAction } from "../actions/topics";

const categoryColors: Record<string, string> = {
  NEWS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MEME_WORTHY: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LEARNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  TOOL_RELEASE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  AI_UPDATE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

function formatCategory(category: TopicCategory): string {
  return category.replace("_", " ");
}

type TopicCardProps = {
  isSelected: boolean;
  onAction: () => void;
  onToggleSelect: (id: string) => void;
  topic: Topic;
};

export function TopicCard({
  isSelected,
  onAction,
  onToggleSelect,
  topic,
}: TopicCardProps) {
  const [open, setOpen] = useState(false);
  const [selectPending, startSelectTransition] = useTransition();
  const [archivePending, startArchiveTransition] = useTransition();

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card
        className={`transition-colors ${
          isSelected
            ? "border-primary bg-primary/[0.02]"
            : "hover:border-primary/30"
        }`}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <Checkbox
              aria-label={`Select ${topic.title}`}
              checked={isSelected}
              className="mt-0.5"
              onCheckedChange={() => onToggleSelect(topic.id)}
            />
            <div className="min-w-0 flex-1">
              <CollapsibleTrigger asChild>
                <button className="w-full text-left" type="button">
                  <CardTitle className="text-sm leading-snug">
                    {topic.title}
                  </CardTitle>
                </button>
              </CollapsibleTrigger>
            </div>
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
          <p
            className={`mb-3 text-muted-foreground text-sm ${
              open ? "" : "line-clamp-2"
            }`}
          >
            {topic.summary}
          </p>

          <CollapsibleContent>
            {topic.rawData && (
              <div className="mb-3 rounded-md border bg-muted/30 p-3">
                <p className="mb-1.5 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                  Raw Data
                </p>
                <pre className="max-h-48 overflow-auto font-mono text-muted-foreground text-xs leading-relaxed">
                  {JSON.stringify(topic.rawData, null, 2)}
                </pre>
              </div>
            )}
          </CollapsibleContent>

          <div className="flex items-center gap-2">
            <Badge
              className={
                categoryColors[topic.category] ??
                "bg-muted text-muted-foreground"
              }
              variant="secondary"
            >
              {formatCategory(topic.category)}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {topic.sourceName}
            </span>
            <span className="ml-auto text-muted-foreground/60 text-xs">
              {new Date(topic.discoveredAt).toLocaleDateString()}
            </span>
          </div>

          <div className="mt-3 flex items-center gap-2 border-t pt-3">
            <Button
              disabled={selectPending}
              onClick={() =>
                startSelectTransition(async () => {
                  await selectTopicAction(topic.id);
                  onAction();
                })
              }
              size="xs"
              variant="default"
            >
              <Sparkles className="size-3" />
              {selectPending ? "Selecting..." : "Select"}
            </Button>
            <Button
              disabled={archivePending}
              onClick={() =>
                startArchiveTransition(async () => {
                  await archiveTopicAction(topic.id);
                  onAction();
                })
              }
              size="xs"
              variant="ghost"
            >
              <Archive className="size-3" />
              {archivePending ? "Archiving..." : "Archive"}
            </Button>

            <CollapsibleTrigger asChild>
              <Button className="ml-auto" size="xs" variant="ghost">
                {open ? (
                  <>
                    <ChevronUp className="size-3" />
                    Collapse
                  </>
                ) : (
                  <>
                    <ChevronDown className="size-3" />
                    Details
                  </>
                )}
              </Button>
            </CollapsibleTrigger>
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
