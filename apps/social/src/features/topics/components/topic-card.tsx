"use client";

import type { Topic } from "@allonfire/database";
import { Badge } from "@allonfire/ui/components/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { Collapsible } from "@allonfire/ui/components/collapsible";
import { cn } from "@allonfire/ui/lib/utils";
import { m } from "framer-motion";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import { formatCategory, getCategoryColor } from "./topic-utils";

export type TopicCardActionProps = {
  isClamped: boolean;
  open: boolean;
  topic: Topic;
};

type TopicCardProps = {
  onClick?: () => void;
  renderActions: (props: TopicCardActionProps) => ReactNode;
  renderMetaEnd?: ReactNode;
  topic: Topic;
};

export function TopicCard({
  onClick,
  renderActions,
  renderMetaEnd,
  topic,
}: TopicCardProps) {
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
    <m.div
      className={cn("group", onClick && "cursor-pointer")}
      onClick={onClick}
      transition={{ duration: 0.2 }}
      whileHover={{ y: -2 }}
    >
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
                onClick={(e) => e.stopPropagation()}
                rel="noopener noreferrer"
                target="_blank"
              >
                <ExternalLink className="size-4.5" />
              </a>
            </div>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col">
            <p
              className={cn(
                "mb-2 text-muted-foreground text-sm",
                !open && "line-clamp-6"
              )}
              ref={summaryRef}
            >
              {topic.summary}
            </p>

            <div className="mt-2 flex items-center gap-2">
              <Badge
                className={getCategoryColor(topic.category)}
                variant="secondary"
              >
                {formatCategory(topic.category)}
              </Badge>
              <span className="hidden text-muted-foreground text-xs sm:inline">
                {topic.sourceName}
              </span>
              {renderMetaEnd ?? (
                <span className="ml-auto text-muted-foreground/60 text-xs">
                  {new Date(topic.discoveredAt).toLocaleDateString()}
                </span>
              )}
            </div>

            {/* biome-ignore lint/a11y/noStaticElementInteractions: event propagation barrier, not interactive */}
            {/* biome-ignore lint/a11y/noNoninteractiveElementInteractions: same — prevents parent onClick on child button clicks */}
            <div
              className="mt-3 flex items-center gap-2 border-t pt-3"
              onClick={(e) => e.stopPropagation()}
              onKeyDown={(e) => e.stopPropagation()}
            >
              {renderActions({ isClamped, open, topic })}
            </div>
          </CardContent>
        </Card>
      </Collapsible>
    </m.div>
  );
}
