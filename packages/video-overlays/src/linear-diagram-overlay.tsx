import type React from "react";
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";
import type { LinearDiagramProps, LinearDiagramStep } from "./spec";

const UI_EASE = Easing.bezier(0.16, 1, 0.3, 1);
const MONO_FONT = '"SFMono-Regular", Consolas, "Liberation Mono", monospace';
const SYSTEM_FONT =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';

export type LinearDiagramLayout = {
  activeLabelFontSize: number;
  assetHeight: number;
  captionFontSize: number;
  contextFontSize: number;
  isImpact: boolean;
  isVertical: boolean;
  isZigzag: boolean;
  markSize: number;
  railHeight: number;
  shellHeight: number;
  shellPadding: string;
  shellWidth: number;
  titleFontSize: number;
};

export function getLinearDiagramLayout(
  width: number,
  height: number,
  orientation: LinearDiagramProps["orientation"]
): LinearDiagramLayout {
  const portrait = height > width;
  const isVertical =
    orientation === "vertical" || (orientation === "auto" && portrait);
  const shellWidth = Math.round(
    isVertical ? Math.min(width * 0.84, 900) : Math.min(width * 0.88, 1690)
  );
  const shellHeight = Math.round(
    isVertical ? Math.min(height * 0.8, 1540) : Math.min(height * 0.78, 845)
  );

  return {
    activeLabelFontSize: isVertical ? 70 : 88,
    assetHeight: isVertical ? 500 : 420,
    captionFontSize: isVertical ? 28 : 27,
    contextFontSize: isVertical ? 26 : 22,
    isImpact: true,
    isVertical,
    isZigzag: false,
    markSize: isVertical ? 82 : 88,
    railHeight: isVertical ? 96 : 86,
    shellHeight,
    shellPadding: isVertical ? "44px 46px 46px" : "46px 54px 48px",
    shellWidth,
    titleFontSize: isVertical ? 54 : 58,
  };
}

function enterProgress(frame: number, startFrame: number, duration: number) {
  return interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    easing: UI_EASE,
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
}

function activeIndexStatus(
  step: LinearDiagramStep,
  index: number,
  activeIndex: number
): LinearDiagramStep["status"] {
  if (step.status === "warning") {
    return "warning";
  }
  if (index < activeIndex) {
    return "complete";
  }
  if (index === activeIndex) {
    return "active";
  }
  return "queued";
}

function stepColor(step: LinearDiagramStep, props: LinearDiagramProps): string {
  if (step.accent) {
    return step.accent;
  }
  if (step.status === "active") {
    return props.theme.accent;
  }
  if (step.status === "complete") {
    return props.theme.complete;
  }
  if (step.status === "warning") {
    return props.theme.warning;
  }
  return props.theme.info;
}

function resolveSteps(props: LinearDiagramProps): LinearDiagramStep[] {
  return props.steps.map((step, index) => ({
    ...step,
    status: activeIndexStatus(step, index, props.activeIndex),
  }));
}

function StatusMark({
  color,
  index,
  layout,
  step,
}: {
  color: string;
  index: number;
  layout: LinearDiagramLayout;
  step: LinearDiagramStep;
}) {
  const label =
    step.status === "complete" ? "OK" : String(index + 1).padStart(2, "0");

  return (
    <div
      style={{
        alignItems: "center",
        background:
          step.status === "active"
            ? "oklch(0.69 0.19 48 / 0.16)"
            : "oklch(0.13 0.018 238 / 0.84)",
        border: `3px solid ${color}`,
        borderRadius: 999,
        color,
        display: "flex",
        fontFamily: MONO_FONT,
        fontSize: layout.isVertical ? 25 : 27,
        fontWeight: 860,
        height: layout.markSize,
        justifyContent: "center",
        lineHeight: 1,
        width: layout.markSize,
      }}
    >
      {label}
    </div>
  );
}

function AssetPanel({
  activeStep,
  color,
  layout,
}: {
  activeStep: LinearDiagramStep;
  color: string;
  layout: LinearDiagramLayout;
}) {
  const frame = useCurrentFrame();
  const reveal = enterProgress(frame, 12, 24);
  const scale = interpolate(reveal, [0, 1], [0.96, 1]);
  const opacity = interpolate(reveal, [0, 1], [0, 1]);

  return (
    <div
      style={{
        alignItems: "center",
        background:
          "linear-gradient(145deg, oklch(0.12 0.018 238), oklch(0.2 0.02 232))",
        border: `2px solid ${color}`,
        borderRadius: 24,
        boxShadow: `0 36px 90px oklch(0.09 0.018 238 / 0.42), 0 0 72px ${color}`,
        display: "flex",
        height: layout.assetHeight,
        justifyContent: "center",
        minWidth: 0,
        opacity,
        overflow: "hidden",
        padding: layout.isVertical ? 26 : 34,
        position: "relative",
        transform: `scale(${scale})`,
      }}
    >
      <div
        style={{
          background:
            "radial-gradient(circle at 28% 20%, oklch(0.69 0.19 48 / 0.3), transparent 34%)",
          inset: 0,
          position: "absolute",
        }}
      />
      {activeStep.asset ? (
        <Img
          src={staticFile(activeStep.asset)}
          style={{
            height: "100%",
            objectFit: "contain",
            position: "relative",
            width: "100%",
          }}
        />
      ) : (
        <div
          style={{
            backgroundImage:
              "linear-gradient(oklch(0.9 0.01 84 / 0.18) 1px, transparent 1px), linear-gradient(90deg, oklch(0.9 0.01 84 / 0.16) 1px, transparent 1px)",
            backgroundSize: "34px 34px",
            borderRadius: 20,
            height: "100%",
            position: "relative",
            width: "100%",
          }}
        />
      )}
    </div>
  );
}

function ActiveCopy({
  activeStep,
  color,
  index,
  layout,
}: {
  activeStep: LinearDiagramStep;
  color: string;
  index: number;
  layout: LinearDiagramLayout;
}) {
  const frame = useCurrentFrame();
  const appear = enterProgress(frame, 18, 20);
  const y = interpolate(appear, [0, 1], [18, 0]);

  return (
    <div
      style={{
        alignContent: "center",
        display: "grid",
        gap: layout.isVertical ? 20 : 28,
        minWidth: 0,
        opacity: appear,
        transform: `translateY(${y}px)`,
      }}
    >
      <StatusMark
        color={color}
        index={index}
        layout={layout}
        step={activeStep}
      />
      <div>
        <div
          style={{
            color: "oklch(0.92 0.018 78)",
            fontSize: layout.activeLabelFontSize,
            fontWeight: 880,
            letterSpacing: 0,
            lineHeight: 0.95,
          }}
        >
          {activeStep.label}
        </div>
        {activeStep.meta ? (
          <div
            style={{
              color,
              fontFamily: MONO_FONT,
              fontSize: layout.contextFontSize,
              fontWeight: 780,
              letterSpacing: "0.04em",
              marginTop: 18,
              textTransform: "uppercase",
            }}
          >
            {activeStep.meta}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SequenceRail({
  activeIndex,
  layout,
  props,
  steps,
}: {
  activeIndex: number;
  layout: LinearDiagramLayout;
  props: LinearDiagramProps;
  steps: LinearDiagramStep[];
}) {
  const frame = useCurrentFrame();

  return (
    <div
      style={{
        alignItems: "stretch",
        display: "grid",
        gap: layout.isVertical ? 10 : 12,
        gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))`,
        height: layout.railHeight,
        minWidth: 0,
      }}
    >
      {steps.map((step, index) => {
        const color = stepColor(step, props);
        const appear = enterProgress(frame, 30 + index * 4, 16);
        const isActive = index === activeIndex;

        return (
          <div
            key={`${step.label}-${index}`}
            style={{
              alignContent: "center",
              background: isActive
                ? "oklch(0.69 0.19 48 / 0.16)"
                : "oklch(0.2 0.018 232 / 0.68)",
              border: `1px solid ${isActive ? color : props.theme.line}`,
              borderRadius: 16,
              display: "grid",
              gap: 8,
              opacity: isActive ? appear : appear * 0.52,
              padding: layout.isVertical ? "10px 8px" : "12px 10px",
              transform: `translateY(${interpolate(appear, [0, 1], [12, 0])}px)`,
            }}
          >
            <span
              style={{
                color,
                fontFamily: MONO_FONT,
                fontSize: layout.isVertical ? 14 : 15,
                fontWeight: 850,
                lineHeight: 1,
              }}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <span
              style={{
                color: props.theme.text,
                fontSize: layout.isVertical ? 15 : 17,
                fontWeight: 820,
                lineHeight: 1.05,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export const LinearDiagramOverlay: React.FC<LinearDiagramProps> = (props) => {
  const frame = useCurrentFrame();
  const { height, width } = useVideoConfig();
  const layout = getLinearDiagramLayout(width, height, props.orientation);
  const steps = resolveSteps(props);
  const activeIndex = Math.min(props.activeIndex, steps.length - 1);
  const activeStep = steps[activeIndex] ?? steps[0];
  const activeColor = stepColor(activeStep, props);
  const entrance = enterProgress(frame, 0, 24);

  return (
    <AbsoluteFill
      style={{
        alignItems: "center",
        background:
          "linear-gradient(135deg, oklch(0.12 0.018 238), oklch(0.07 0.014 240))",
        color: props.theme.text,
        display: "flex",
        fontFamily: SYSTEM_FONT,
        justifyContent: "center",
      }}
    >
      <div
        style={{
          background:
            "linear-gradient(145deg, oklch(0.23 0.018 232 / 0.98), oklch(0.15 0.016 238 / 0.98))",
          border: "1px solid oklch(0.66 0.04 82 / 0.22)",
          borderRadius: 24,
          boxShadow: "0 30px 90px oklch(0.05 0.018 238 / 0.5)",
          display: "grid",
          gap: layout.isVertical ? 26 : 34,
          gridTemplateRows: "auto 1fr auto",
          height: layout.shellHeight,
          opacity: entrance,
          padding: layout.shellPadding,
          transform: `translateY(${interpolate(entrance, [0, 1], [18, 0])}px)`,
          width: layout.shellWidth,
        }}
      >
        <header
          style={{
            alignItems: "end",
            display: "grid",
            gap: layout.isVertical ? 12 : 34,
            gridTemplateColumns: layout.isVertical
              ? "1fr"
              : "minmax(0, 1fr) 430px",
          }}
        >
          <div>
            <div
              style={{
                color: props.theme.accent,
                fontFamily: MONO_FONT,
                fontSize: layout.isVertical ? 20 : 18,
                fontWeight: 820,
                letterSpacing: "0.12em",
                lineHeight: 1,
                textTransform: "uppercase",
              }}
            >
              {props.eyebrow}
            </div>
            <div
              style={{
                color: props.theme.text,
                fontSize: layout.titleFontSize,
                fontWeight: 860,
                letterSpacing: 0,
                lineHeight: 1,
                marginTop: 14,
              }}
            >
              {props.title}
            </div>
          </div>
          {props.caption ? (
            <div
              style={{
                color: props.theme.muted,
                fontSize: layout.captionFontSize,
                lineHeight: 1.28,
              }}
            >
              {props.caption}
            </div>
          ) : null}
        </header>

        <main
          style={{
            alignItems: "stretch",
            display: "grid",
            gap: layout.isVertical ? 28 : 44,
            gridTemplateColumns: layout.isVertical
              ? "1fr"
              : "minmax(0, 1.05fr) minmax(0, 0.95fr)",
            minHeight: 0,
          }}
        >
          <AssetPanel
            activeStep={activeStep}
            color={activeColor}
            layout={layout}
          />
          <ActiveCopy
            activeStep={activeStep}
            color={activeColor}
            index={activeIndex}
            layout={layout}
          />
        </main>

        <SequenceRail
          activeIndex={activeIndex}
          layout={layout}
          props={props}
          steps={steps}
        />
      </div>
    </AbsoluteFill>
  );
};
