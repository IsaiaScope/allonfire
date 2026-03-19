"use client";

import type { Topic, TopicCategory } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Collapsible } from "@allonfire/ui/components/collapsible";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";

export const categoryColors: Record<string, string> = {
  NEWS: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  MEME_WORTHY: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  LEARNING: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  TOOL_RELEASE: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  AI_UPDATE: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
};

export function formatCategory(category: TopicCategory): string {
  return category.replace("_", " ");
}

export type TopicCardActionProps = {
  isClamped: boolean;
  open: boolean;
  topic: Topic;
};

type TopicCardProps = {
  renderActions: (props: TopicCardActionProps) => ReactNode;
  topic: Topic;
};

export function TopicCard({ renderActions, topic }: TopicCardProps) {
  const [open, setOpen] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const summaryRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const el = summaryRef.current;
    if (!el) {
      return;
    }
    const observer = new ResizeObserver(() => {
      if (!open) {
        const clamped = el.scrollHeight > el.clientHeight;
        setIsClamped((prev) => (prev === clamped ? prev : clamped));
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [open]);

  return (
    <Collapsible onOpenChange={setOpen} open={open}>
      <Card className="flex flex-col gap-2 transition-colors hover:border-primary/30">
        <CardHeader className="pb-3">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <CardTitle className="line-clamp-5 text-sm leading-snug">
                {topic.title}
              </CardTitle>
            </div>
            <a
              aria-label="Open source"
              className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
              href={topic.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              <ExternalLink className="size-4.5" />
            </a>
          </div>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col">
          <p
            className={`mb-2 text-muted-foreground text-sm ${
              open ? "" : "line-clamp-6"
            }`}
            ref={summaryRef}
          >
            {topic.summary}
          </p>

          <div className="mt-2 flex items-center gap-2">
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
            {renderActions({ isClamped, open, topic })}
          </div>
        </CardContent>
      </Card>
    </Collapsible>
  );
}
