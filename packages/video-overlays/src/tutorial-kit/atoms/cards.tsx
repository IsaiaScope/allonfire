import type React from "react";
import { cn } from "../lib/cn";
import {
  type OverlayTone,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from "../lib/tones";
import type { AtomDensity, AtomSize } from "./types";

type BaseAtomProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  size?: AtomSize;
  tone?: OverlayTone;
};

export type PaperCardProps = BaseAtomProps & {
  label?: React.ReactNode;
};

export function PaperCard({
  children,
  className,
  density = "normal",
  label,
  tone = "coral",
  ...props
}: PaperCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid min-w-104 gap-5 rounded-[8px] border-4 bg-az-bone",
        pad(density),
        toneBorderClass(tone),
        className
      )}
      data-slot="paper-card"
      {...props}
    >
      {label ? <Small tone={tone}>{label}</Small> : null}
      <Content>{children}</Content>
    </div>
  );
}

export function InkCard({
  children,
  className,
  density = "normal",
  label,
  tone = "coral",
  ...props
}: PaperCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid min-w-104 gap-5 rounded-[8px] border-2 border-az-paper/16 bg-az-ink text-az-paper",
        pad(density),
        className
      )}
      data-slot="ink-card"
      {...props}
    >
      {label ? <Small tone={tone}>{label}</Small> : null}
      <div className="font-az-sans font-extrabold text-6xl text-az-paper leading-none">
        {children}
      </div>
    </div>
  );
}

export function AccentCard({
  children,
  className,
  density = "normal",
  tone = "coral",
  ...props
}: PaperCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid min-w-104 place-items-center rounded-[8px] text-center text-az-paper",
        pad(density),
        toneBgClass(tone),
        className
      )}
      data-slot="accent-card"
      {...props}
    >
      <div className="font-az-sans font-extrabold text-6xl leading-none">
        {children}
      </div>
    </div>
  );
}

export function FloatingNote({
  children,
  className,
  density = "normal",
  tone = "mustard",
  ...props
}: PaperCardProps) {
  return (
    <PaperCard
      className={cn("-rotate-2", className)}
      density={density}
      tone={tone}
      {...props}
      data-slot="floating-note"
    >
      {children}
    </PaperCard>
  );
}

export type QuotePanelProps = PaperCardProps & {
  attribution?: React.ReactNode;
};

export function QuotePanel({
  attribution,
  children,
  className,
  tone = "coral",
  ...props
}: QuotePanelProps) {
  return (
    <PaperCard
      className={className}
      tone={tone}
      {...props}
      data-slot="quote-panel"
    >
      <div className="font-az-serif text-7xl text-az-ink italic leading-none">
        {children}
      </div>
      {attribution ? <Small tone={tone}>{attribution}</Small> : null}
    </PaperCard>
  );
}

export function WarningPanel({
  children = "Risk",
  className,
  tone = "mustard",
  ...props
}: PaperCardProps) {
  return (
    <PaperCard
      className={className}
      label="warning"
      tone={tone}
      {...props}
      data-slot="warning-panel"
    >
      {children}
    </PaperCard>
  );
}

export function SuccessPanel({
  children = "Done",
  className,
  tone = "olive",
  ...props
}: PaperCardProps) {
  return (
    <PaperCard
      className={className}
      label="success"
      tone={tone}
      {...props}
      data-slot="success-panel"
    >
      {children}
    </PaperCard>
  );
}

export type CommandCardProps = PaperCardProps & {
  command?: React.ReactNode;
};

export function CommandCard({
  className,
  command = "pnpm render",
  tone = "coral",
  ...props
}: CommandCardProps) {
  return (
    <InkCard
      className={className}
      label="command"
      tone={tone}
      {...props}
      data-slot="command-card"
    >
      <span className="font-az-mono">{command}</span>
    </InkCard>
  );
}

export type ShortcutCardProps = PaperCardProps & {
  keys?: React.ReactNode;
};

export function ShortcutCard({
  className,
  keys = "CMD K",
  tone = "ink",
  ...props
}: ShortcutCardProps) {
  return (
    <PaperCard
      className={className}
      label="shortcut"
      tone={tone}
      {...props}
      data-slot="shortcut-card"
    >
      <span className="font-az-mono">{keys}</span>
    </PaperCard>
  );
}

export type ResourceCardProps = PaperCardProps & {
  name?: React.ReactNode;
};

export function ResourceCard({
  className,
  name = "docs.md",
  tone = "mustard",
  ...props
}: ResourceCardProps) {
  return (
    <PaperCard
      className={className}
      label="resource"
      tone={tone}
      {...props}
      data-slot="resource-card"
    >
      {name}
    </PaperCard>
  );
}

export type ResultCardProps = PaperCardProps & {
  result?: React.ReactNode;
};

export function ResultCard({
  className,
  result = "Ready",
  tone = "olive",
  ...props
}: ResultCardProps) {
  return (
    <PaperCard
      className={className}
      label="result"
      tone={tone}
      {...props}
      data-slot="result-card"
    >
      {result}
    </PaperCard>
  );
}

export type MiniDashboardCardProps = BaseAtomProps & {
  items?: React.ReactNode[];
};

export function MiniDashboardCard({
  className,
  items = ["Queue", "Build", "Done"],
  tone = "coral",
  ...props
}: MiniDashboardCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid w-full max-w-4xl gap-5 rounded-[8px] border-2 border-az-ink/18 bg-az-bone p-8",
        className
      )}
      data-slot="mini-dashboard-card"
      {...props}
    >
      {items.slice(0, 3).map((item, index) => (
        <div
          className="grid grid-cols-[auto_1fr_auto] items-center gap-5 rounded-[6px] bg-az-paper/70 p-5"
          key={`dashboard-item-${String(item)}`}
        >
          <span
            className={cn(
              "size-5 rounded-full",
              dashboardItemToneClass(index, tone)
            )}
          />
          <div className="font-az-sans font-extrabold text-4xl text-az-ink">
            {item}
          </div>
          <div className="font-az-mono text-2xl text-az-ink-faint">
            {String(index + 1).padStart(2, "0")}
          </div>
        </div>
      ))}
    </div>
  );
}

function dashboardItemToneClass(index: number, tone: OverlayTone) {
  if (index === 2) {
    return "bg-az-olive";
  }

  if (index === 1) {
    return "bg-az-mustard";
  }

  return toneBgClass(tone);
}

function Small({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: OverlayTone;
}) {
  return (
    <div
      className={cn(
        "font-az-mono font-semibold text-2xl uppercase tracking-[0.16em]",
        toneTextClass(tone)
      )}
    >
      {children}
    </div>
  );
}

function Content({ children }: { children: React.ReactNode }) {
  return (
    <div className="font-az-sans font-extrabold text-6xl text-az-ink leading-none">
      {children}
    </div>
  );
}

function pad(density: AtomDensity) {
  if (density === "compact") {
    return "p-8";
  }
  if (density === "spacious") {
    return "p-14";
  }
  return "p-10";
}
