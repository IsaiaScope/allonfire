import type React from "react";
import { cn } from "../lib/cn";
import type { OverlayTone } from "../lib/tones";
import { MetaStrip } from "../primitives/meta-strip";
import { PaperPanel } from "../primitives/paper-panel";
import type { AtomDensity } from "./types";

export type PaperSurfaceProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  variant?: "solid" | "translucent";
};

export function PaperSurface({
  children,
  className,
  density = "normal",
  variant = "solid",
  ...props
}: PaperSurfaceProps) {
  return (
    <PaperPanel
      className={cn(
        "min-w-[280px]",
        density === "compact" && "p-5",
        density === "normal" && "p-8",
        density === "spacious" && "p-12",
        className
      )}
      data-density={density}
      data-slot="paper-surface"
      mode={variant}
      {...props}
    >
      {children}
    </PaperPanel>
  );
}

export type InkSurfaceProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
};

export function InkSurface({
  children,
  className,
  density = "normal",
  ...props
}: InkSurfaceProps) {
  return (
    <div
      className={cn(
        "az-video-shadow rounded-[8px] border-2 border-az-paper/18 bg-az-ink text-az-paper",
        density === "compact" && "p-5",
        density === "normal" && "p-8",
        density === "spacious" && "p-12",
        className
      )}
      data-density={density}
      data-slot="ink-surface"
      {...props}
    >
      {children}
    </div>
  );
}

export type FloatingCardProps = React.ComponentProps<"div"> & {
  density?: AtomDensity;
  tone?: OverlayTone;
};

export function FloatingCard({
  children,
  className,
  density = "normal",
  ...props
}: FloatingCardProps) {
  return (
    <div
      className={cn(
        "az-video-shadow rounded-[8px] border-2 border-az-ink/18 bg-az-bone/94",
        density === "compact" && "p-4",
        density === "normal" && "p-7",
        density === "spacious" && "p-10",
        className
      )}
      data-density={density}
      data-slot="floating-card"
      {...props}
    >
      {children}
    </div>
  );
}

export type MetadataStripProps = React.ComponentProps<"div"> & {
  left: React.ReactNode;
  right: React.ReactNode;
};

export function MetadataStrip(props: MetadataStripProps) {
  return <MetaStrip data-slot="metadata-strip" {...props} />;
}
