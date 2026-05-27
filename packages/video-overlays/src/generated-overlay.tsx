import type React from "react";
import {
  AbsoluteFill,
  Easing,
  interpolate,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type {
  GeneratedOverlayDensity,
  GeneratedOverlayItem,
  GeneratedOverlayMotion,
} from "./spec";
import {
  CodeBlock,
  FlowNode,
  InkCard,
  MiniDashboardCard,
  PaperCard,
  SoundCue,
  StepPill,
  TerminalFrame,
} from "./tutorial-kit";

export type GeneratedOverlayBackground = "stage" | "transparent";

export type GeneratedOverlayClipProps = {
  background?: GeneratedOverlayBackground;
  item: GeneratedOverlayItem;
};

const UI_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const FENCED_CODE_RE = /```(?:\w+)?\n([\s\S]*?)```/;
const DENSITY_LIMITS: Record<GeneratedOverlayDensity, number> = {
  light: 3,
  medium: 5,
  rich: 7,
};

function plainText(value: string): string {
  return value
    .replace(/```[\s\S]*?```/g, "")
    .replace(/[*_`>#|]/g, "")
    .replace(/^- /gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function lineLimit(item: GeneratedOverlayItem, fallback = 5): number {
  return DENSITY_LIMITS[item.density] ?? fallback;
}

function shortLines(value: string, limit = 4): string[] {
  const lines = plainText(value)
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, limit);
  if (lines.length > 0) {
    return lines;
  }
  return [];
}

function codeLines(item: GeneratedOverlayItem): string[] {
  const fenced = item.body.match(FENCED_CODE_RE);
  const source = fenced?.[1] ?? item.body;
  return source
    .split("\n")
    .map((line) => line.trimEnd())
    .filter(Boolean)
    .slice(0, item.density === "rich" ? 9 : 7);
}

function tableRows(
  item: GeneratedOverlayItem
): { label: string; value: string }[] {
  const markdownRows = item.body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.startsWith("|") && !line.includes("---"))
    .map((line) =>
      line
        .split("|")
        .map((part) => part.trim())
        .filter(Boolean)
    )
    .filter((parts) => parts.length >= 2)
    .slice(0, lineLimit(item))
    .map(([label, value]) => ({ label, value }));

  if (markdownRows.length > 0) {
    return markdownRows;
  }

  return shortLines(item.body, lineLimit(item)).map((line, index) => ({
    label: String(index + 1).padStart(2, "0"),
    value: line,
  }));
}

function revealStyle({
  frame,
  index,
  motion,
}: {
  frame: number;
  index: number;
  motion: GeneratedOverlayMotion;
}): React.CSSProperties {
  const delay = motion === "build" || motion === "type-on" ? 6 + index * 7 : 0;
  const progress = interpolate(frame, [delay, delay + 14], [0, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse =
    motion === "pulse"
      ? 1 +
        interpolate(frame % 42, [0, 12, 42], [0, 0.025, 0], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        })
      : 1;
  return {
    opacity: progress,
    transform: `translateY(${(1 - progress) * 16}px) scale(${pulse})`,
  };
}

function dashboardIndexLabel(index: number): string {
  if (index === 0) {
    return "01";
  }
  if (index === 1) {
    return "02";
  }
  return "03";
}

function flowContainerClass({
  denseLandscape,
  isPortrait,
}: {
  denseLandscape: boolean;
  isPortrait: boolean;
}): string {
  if (isPortrait) {
    return "grid gap-6";
  }
  if (denseLandscape) {
    return "grid grid-cols-4 gap-5";
  }
  return "grid grid-cols-3 gap-6";
}

function AspectShell({
  children,
  item,
}: {
  children: React.ReactNode;
  item: GeneratedOverlayItem;
}) {
  const { height, width } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <div
      className={[
        "grid gap-8",
        isPortrait ? "w-[54rem] max-w-full" : "w-[84rem]",
      ].join(" ")}
    >
      <div className="grid gap-3">
        <div className="font-az-mono text-az-coral text-xl uppercase tracking-[0]">
          {item.kind} · {item.motion}
        </div>
        <h1
          className={[
            "m-0 font-az-sans font-black text-az-paper leading-[0.94]",
            isPortrait ? "text-6xl" : "text-7xl",
          ].join(" ")}
        >
          {item.emphasis}
        </h1>
        <p
          className={[
            "m-0 max-w-[68rem] font-az-sans font-semibold text-az-paper/68 leading-tight",
            isPortrait ? "text-3xl" : "text-4xl",
          ].join(" ")}
        >
          {item.purpose}
        </p>
      </div>
      {children}
    </div>
  );
}

function DashboardTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const isPortrait = height > width;
  const rows = shortLines(item.body, lineLimit(item));
  return (
    <AspectShell item={item}>
      <div className={isPortrait ? "grid gap-5" : "grid grid-cols-3 gap-5"}>
        {["Da chiarire", "In evidenza", "Azione"].map((label, index) => (
          <PaperCard
            className="min-h-[16rem]"
            key={`${item.id}-${label}`}
            label={label}
            tone={index === 1 ? "coral" : "olive"}
          >
            <div
              className="grid gap-4"
              style={revealStyle({
                frame,
                index,
                motion: item.motion,
              })}
            >
              <div className="font-az-sans font-black text-5xl leading-none">
                {dashboardIndexLabel(index)}
              </div>
              <div className="font-az-sans font-semibold text-3xl leading-tight">
                {rows[index] ?? item.title}
              </div>
            </div>
          </PaperCard>
        ))}
      </div>
      <MiniDashboardCard items={rows.slice(0, 3)} tone="coral" />
    </AspectShell>
  );
}

function FlowTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const isPortrait = height > width;
  const lines = shortLines(item.body, isPortrait ? 4 : lineLimit(item));
  const labels = lines.length > 0 ? lines : [item.title, item.purpose];
  const denseLandscape = !isPortrait && labels.length > 3;
  const containerClass = flowContainerClass({ denseLandscape, isPortrait });
  return (
    <AspectShell item={item}>
      <div className={containerClass}>
        {labels.map((label, index) => (
          <div
            className="min-w-0"
            key={`${item.id}-${label}`}
            style={revealStyle({ frame, index, motion: item.motion })}
          >
            <FlowNode
              className="h-full w-full"
              density={denseLandscape ? "compact" : "normal"}
              label={label}
              meta={index === 0 ? "input" : `step ${index + 1}`}
              size={isPortrait || denseLandscape ? "sm" : "md"}
              tone={index === 0 ? "coral" : "mustard"}
            />
          </div>
        ))}
      </div>
    </AspectShell>
  );
}

function TableTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const rows = tableRows(item);
  return (
    <AspectShell item={item}>
      <PaperCard label={item.title} tone="coral">
        <div className="grid gap-4 text-4xl leading-tight">
          {rows.map((row, index) => (
            <div
              className="grid grid-cols-[1fr_auto] gap-8 border-az-ink/12 border-b pb-3 last:border-b-0"
              key={`${item.id}-${row.label}-${row.value}`}
              style={revealStyle({ frame, index, motion: item.motion })}
            >
              <span>{row.label}</span>
              <span className="font-az-mono text-az-coral">{row.value}</span>
            </div>
          ))}
        </div>
      </PaperCard>
    </AspectShell>
  );
}

function ListTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const lines = shortLines(item.body, lineLimit(item));
  return (
    <AspectShell item={item}>
      <PaperCard label={item.title} tone="olive">
        <div className="grid gap-5">
          {lines.map((line, index) => (
            <div
              key={`${item.id}-${line}`}
              style={revealStyle({ frame, index, motion: item.motion })}
            >
              <StepPill
                label={String(index + 1).padStart(2, "0")}
                tone="olive"
                value={line}
              />
            </div>
          ))}
        </div>
      </PaperCard>
    </AspectShell>
  );
}

function CodeTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const visibleLines =
    item.motion === "type-on"
      ? codeLines(item).slice(0, Math.max(1, Math.floor(frame / 10)))
      : codeLines(item);
  return (
    <AspectShell item={item}>
      <TerminalFrame
        command={<CodeBlock file="terminal" lines={visibleLines} />}
        label={item.title}
      />
    </AspectShell>
  );
}

function CompareTemplate({ item }: { item: GeneratedOverlayItem }) {
  const frame = useCurrentFrame();
  const rows = shortLines(item.body, 4);
  const midpoint = Math.ceil(rows.length / 2);
  const groups = [
    { label: "Prima", tone: "olive" as const, values: rows.slice(0, midpoint) },
    { label: "Dopo", tone: "coral" as const, values: rows.slice(midpoint) },
  ];
  return (
    <AspectShell item={item}>
      <div className="grid grid-cols-2 gap-6">
        {groups.map((group, groupIndex) => (
          <div
            key={group.label}
            style={revealStyle({
              frame,
              index: groupIndex,
              motion: item.motion,
            })}
          >
            <PaperCard label={group.label} tone={group.tone}>
              <div className="grid gap-3 font-az-sans font-semibold text-3xl leading-tight">
                {(group.values.length > 0 ? group.values : [item.purpose]).map(
                  (value) => (
                    <div key={`${group.label}-${value}`}>{value}</div>
                  )
                )}
              </div>
            </PaperCard>
          </div>
        ))}
      </div>
    </AspectShell>
  );
}

function TemplateBody({ item }: { item: GeneratedOverlayItem }) {
  if (item.motion === "compare") {
    return <CompareTemplate item={item} />;
  }
  if (item.template === "code-card") {
    return <CodeTemplate item={item} />;
  }
  if (item.template === "dashboard-triage") {
    return <DashboardTemplate item={item} />;
  }
  if (item.template === "flow-diagram") {
    return <FlowTemplate item={item} />;
  }
  if (item.template === "table-card") {
    return <TableTemplate item={item} />;
  }
  if (item.template === "list-card") {
    return <ListTemplate item={item} />;
  }
  return (
    <AspectShell item={item}>
      <InkCard label={item.kind} tone="coral">
        <div className="grid gap-5">
          <div className="font-az-sans font-black text-6xl leading-none">
            {item.title}
          </div>
          <div className="font-az-sans font-semibold text-4xl text-az-paper/70 leading-tight">
            {shortLines(item.body, 3).join(" ")}
          </div>
        </div>
      </InkCard>
    </AspectShell>
  );
}

function StageBackground() {
  const { height, width } = useVideoConfig();
  const isPortrait = height > width;
  return (
    <AbsoluteFill
      style={{
        backgroundColor: "#11110f",
        backgroundImage:
          "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)",
        backgroundSize: "48px 48px",
      }}
    >
      <div
        style={{
          bottom: 48,
          color: "rgba(255,255,255,0.45)",
          fontFamily: "Roboto Mono, monospace",
          fontSize: 20,
          left: 56,
          letterSpacing: 0,
          position: "absolute",
          textTransform: "uppercase",
        }}
      >
        AllOnFire overlay · {isPortrait ? "9:16" : "16:9"}
      </div>
    </AbsoluteFill>
  );
}

function OverlaySound({ item }: { item: GeneratedOverlayItem }) {
  if (item.sfx === "none") {
    return null;
  }
  let from = 0;
  if (item.motion === "build" || item.motion === "type-on") {
    from = 5;
  }
  if (item.motion === "pulse") {
    from = 10;
  }
  return <SoundCue cue={item.sfx} from={from} volume={0.12} />;
}

export const GeneratedOverlayClip: React.FC<GeneratedOverlayClipProps> = ({
  background = "transparent",
  item,
}) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const intro = interpolate(frame, [0, 18], [0, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const outro = interpolate(
    frame,
    [Math.max(0, durationInFrames - 18), durationInFrames],
    [1, 0],
    {
      easing: UI_EASE,
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    }
  );
  const opacity = Math.min(intro, outro);
  const y = interpolate(intro, [0, 1], [24, 0]);
  const scale = interpolate(intro, [0, 1], [0.985, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <OverlaySound item={item} />
      {background === "stage" ? <StageBackground /> : null}
      <AbsoluteFill
        style={{
          alignItems: "center",
          backgroundColor: "transparent",
          display: "flex",
          justifyContent: "center",
          opacity,
          padding: 96,
          transform: `translateY(${y}px) scale(${scale})`,
        }}
      >
        <TemplateBody item={item} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};
