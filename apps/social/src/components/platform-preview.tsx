"use client";

import { Badge } from "@allonfire/ui/components/badge";

interface PlatformPreviewProps {
  content: string;
  platform: string;
}

const PLATFORM_CONFIG: Record<
  string,
  { label: string; icon: string; maxPreview: number; style: string }
> = {
  TWITTER: {
    label: "Twitter / X",
    icon: "\u{1D54F}",
    maxPreview: 280,
    style: "font-sans",
  },
  LINKEDIN: {
    label: "LinkedIn",
    icon: "in",
    maxPreview: 3000,
    style: "font-sans leading-relaxed",
  },
  YOUTUBE: {
    label: "YouTube",
    icon: "\u25B6",
    maxPreview: 500,
    style: "font-sans",
  },
  TIKTOK: {
    label: "TikTok",
    icon: "\u266A",
    maxPreview: 2200,
    style: "font-sans",
  },
};

export function PlatformPreview({ content, platform }: PlatformPreviewProps) {
  const config = PLATFORM_CONFIG[platform] ?? {
    label: platform,
    icon: platform[0],
    maxPreview: 1000,
    style: "",
  };

  const isTruncated = content.length > config.maxPreview;
  const displayContent = isTruncated
    ? `${content.slice(0, config.maxPreview)}...`
    : content;

  return (
    <div className="rounded-lg border bg-card">
      <div className="flex items-center gap-2 border-b px-4 py-2">
        <span className="flex size-6 items-center justify-center rounded bg-primary/10 font-bold text-primary text-xs">
          {config.icon}
        </span>
        <span className="font-medium text-sm">{config.label}</span>
        {isTruncated && (
          <Badge className="ml-auto" variant="destructive">
            Over limit
          </Badge>
        )}
      </div>
      <div className="p-4">
        <p className={`whitespace-pre-wrap text-sm ${config.style}`}>
          {displayContent}
        </p>
      </div>
    </div>
  );
}
