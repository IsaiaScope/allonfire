"use client";

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@allonfire/ui/components/card";
import { m } from "framer-motion";
import {
  Compass,
  FileText,
  MessageSquare,
  Search,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import Link from "next/link";

const stages = [
  {
    key: "discovered",
    label: "Topics Discovered",
    description: "Raw topics from sources",
    icon: Search,
    href: null,
    gradient: "from-primary/5 to-primary/15",
    iconBg: "bg-primary/10",
    iconColor: "text-primary",
    glowIdle: "0 0 20px oklch(0.8 0.13 349 / 0.15)",
    glowHover: "0 0 24px oklch(0.8 0.13 349 / 0.2)",
  },
  {
    key: "aiPicked",
    label: "Topics AI Picked",
    description: "Curated by AI for review",
    icon: Compass,
    href: "/discover",
    gradient: "from-secondary/5 to-secondary/15",
    iconBg: "bg-secondary/10",
    iconColor: "text-secondary",
    glowIdle: "0 0 20px oklch(0.74 0.22 142 / 0.15)",
    glowHover: "0 0 24px oklch(0.74 0.22 142 / 0.2)",
  },
  {
    key: "selected",
    label: "Topics Selected",
    description: "Queued for generation",
    icon: Sparkles,
    href: "/generate",
    gradient: "from-accent/5 to-accent/15",
    iconBg: "bg-accent/10",
    iconColor: "text-accent",
    glowIdle: "0 0 20px oklch(0.81 0.08 225 / 0.15)",
    glowHover: "0 0 24px oklch(0.81 0.08 225 / 0.2)",
  },
  {
    key: "prompts",
    label: "Prompts",
    description: "Content prompts",
    icon: FileText,
    href: "/generate",
    gradient: "from-chart-4/5 to-chart-4/15",
    iconBg: "bg-chart-4/10",
    iconColor: "text-chart-4",
    glowIdle: "0 0 20px oklch(0.75 0.15 60 / 0.15)",
    glowHover: "0 0 24px oklch(0.75 0.15 60 / 0.2)",
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.15 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: "easeOut" as const },
  },
};

type PipelineStatsProps = {
  stats: {
    discoveredCount: number;
    aiPickedCount: number;
    selectedCount: number;
    promptCount: number;
    positivePromptCount: number;
    negativePromptCount: number;
    notesCount: number;
  };
};

const feedbackMetrics = [
  {
    key: "positive",
    icon: ThumbsUp,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-500/10",
  },
  {
    key: "negative",
    icon: ThumbsDown,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-500/10",
  },
  {
    key: "notes",
    icon: MessageSquare,
    color: "text-muted-foreground",
    bg: "bg-muted",
  },
] as const;

export function PipelineStats({ stats }: PipelineStatsProps) {
  const values = [
    stats.discoveredCount,
    stats.aiPickedCount,
    stats.selectedCount,
    stats.promptCount,
  ];

  const hasFeedback =
    stats.positivePromptCount > 0 ||
    stats.negativePromptCount > 0 ||
    stats.notesCount > 0;

  const feedbackValues: Record<string, number> = {
    positive: stats.positivePromptCount,
    negative: stats.negativePromptCount,
    notes: stats.notesCount,
  };

  return (
    <m.div
      animate="visible"
      className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
      initial="hidden"
      variants={containerVariants}
    >
      {stages.map((stage, i) => (
        <PipelineCard
          index={i}
          key={stage.key}
          stage={stage}
          value={values[i] ?? 0}
        />
      ))}

      {hasFeedback && (
        <m.div
          className="group"
          variants={cardVariants}
          whileHover={{
            y: -4,
            transition: { duration: 0.2 },
          }}
        >
          <Card className="h-full gap-3 border-border/50 bg-linear-to-br from-chart-5/5 to-chart-5/15 py-4">
            <CardHeader className="flex flex-row items-start justify-between pb-0">
              <div>
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  Prompt Feedback
                </CardTitle>
                <p className="text-muted-foreground/70 text-xs">
                  Ratings and notes
                </p>
              </div>
              <div className="flex items-center justify-center rounded-full bg-chart-5/10 p-2">
                <MessageSquare className="size-4 text-chart-5" />
              </div>
            </CardHeader>
            <CardContent className="mt-auto">
              <div className="flex items-center gap-4">
                {feedbackMetrics.map((metric) => {
                  const Icon = metric.icon;
                  return (
                    <div className="flex items-center gap-2" key={metric.key}>
                      <span className="font-bold text-3xl tabular-nums">
                        {feedbackValues[metric.key]}
                      </span>
                      <div
                        className={`flex items-center justify-center rounded-full p-2 ${metric.bg}`}
                      >
                        <Icon className={`size-4 ${metric.color}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </m.div>
      )}
    </m.div>
  );
}

type PipelineCardProps = {
  stage: (typeof stages)[number];
  value: number;
  index: number;
};

function PipelineCard({ stage, value, index }: PipelineCardProps) {
  const Icon = stage.icon;

  return (
    <m.div
      className="group"
      variants={cardVariants}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
    >
      <CardWrapper href={stage.href}>
        <Card
          className={`h-full gap-3 bg-gradient-to-br py-4 ${stage.gradient} border-border/50 transition-shadow duration-300 ${stage.href ? "cursor-pointer" : ""}`}
          onMouseEnter={(e) => {
            e.currentTarget.style.boxShadow = stage.glowHover;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.boxShadow = stage.glowIdle;
          }}
          style={{ boxShadow: stage.glowIdle }}
        >
          <CardHeader className="flex flex-row items-start justify-between pb-0">
            <div>
              <CardTitle className="font-medium text-muted-foreground text-sm">
                {stage.label}
              </CardTitle>
              <p className="text-muted-foreground/70 text-xs">
                {stage.description}
              </p>
            </div>
            <m.div
              animate={{ scale: [1, 1.08, 1] }}
              className={`flex items-center justify-center rounded-full p-2 ${stage.iconBg}`}
              transition={{
                duration: 3,
                repeat: Number.POSITIVE_INFINITY,
                ease: "easeInOut",
                delay: index * 0.3,
              }}
            >
              <Icon className={`size-4 ${stage.iconColor}`} />
            </m.div>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-3xl tabular-nums">{value}</div>
          </CardContent>
        </Card>
      </CardWrapper>
    </m.div>
  );
}

function CardWrapper({
  href,
  children,
}: {
  href: string | null;
  children: React.ReactNode;
}) {
  if (!href) {
    return children;
  }
  return (
    <Link className="block" href={href}>
      {children}
    </Link>
  );
}
