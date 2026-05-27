import type React from "react";
import { useVideoConfig } from "remotion";
import { MilestoneDot, TimelineAxis } from "../components/charts";
import { TimelineStep } from "../components/concept";
import {
  DecisionNode,
  FlowGroup,
  FlowNode,
  InputNode,
  OutputNode,
  ProcessNode,
  SystemBoundary,
} from "../components/flow";
import type { ComponentDensity, ComponentSize } from "../components/types";
import { cn } from "../lib/cn";
import type { OverlayTone } from "../lib/tones";

export type TutorialTemplateProps = React.ComponentProps<"div"> & {
  density?: ComponentDensity;
  tone?: OverlayTone;
};

export type TemplateStageProps = React.ComponentProps<"div"> & {
  density?: ComponentDensity;
};

export function TemplateStage({
  children,
  className,
  density = "normal",
  ...props
}: TemplateStageProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;

  return (
    <div
      className={cn(
        "grid h-full max-h-full w-full max-w-full place-items-center",
        portrait ? "max-w-[880px]" : "max-w-[1500px]",
        density === "compact" && "gap-8",
        density === "normal" && "gap-12",
        density === "spacious" && "gap-16",
        className
      )}
      data-density={density}
      data-orientation={portrait ? "portrait" : "landscape"}
      data-slot="template-stage"
      {...props}
    >
      {children}
    </div>
  );
}

export function TemplateRow({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex w-full flex-wrap items-center justify-center gap-8",
        className
      )}
      data-slot="template-row"
      {...props}
    >
      {children}
    </div>
  );
}

export function TemplateStack({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn("grid w-full justify-items-center gap-10", className)}
      data-slot="template-stack"
      {...props}
    >
      {children}
    </div>
  );
}

export function TemplateGrid({
  children,
  className,
  ...props
}: React.ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "grid w-full grid-cols-3 items-center justify-items-center gap-8",
        className
      )}
      data-slot="template-grid"
      {...props}
    >
      {children}
    </div>
  );
}

export type FlowSequenceTemplateProps = TutorialTemplateProps & {
  nodes?: [React.ReactNode, React.ReactNode, React.ReactNode];
};

export function FlowSequenceTemplate({
  className,
  density = "normal",
  nodes = ["Input", "Model", "Output"],
  tone = "coral",
  ...props
}: FlowSequenceTemplateProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;
  const nodeSize: ComponentSize = portrait ? "lg" : "sm";

  return (
    <TemplateStage className={className} density={density} {...props}>
      {portrait ? (
        <TemplateStack
          className="min-h-[1320px] max-w-[760px] content-center gap-8"
          data-slot="flow-sequence-template"
        >
          <InputNode
            className="w-full max-w-[660px]"
            density="normal"
            label={nodes[0]}
            meta="source"
            size={nodeSize}
            tone="mustard"
          />
          <VerticalConnector />
          <ProcessNode
            className="w-full max-w-[660px]"
            density="normal"
            label={nodes[1]}
            size={nodeSize}
            step="02"
            tone={tone}
          />
          <VerticalConnector tone="olive" />
          <OutputNode
            className="w-full max-w-[660px]"
            density="normal"
            label={nodes[2]}
            meta="result"
            size={nodeSize}
          />
        </TemplateStack>
      ) : (
        <div
          className="grid grid-cols-[1fr_auto_1fr_auto_1fr] items-center justify-items-center gap-6"
          data-slot="flow-sequence-template"
        >
          <InputNode
            density="compact"
            label={nodes[0]}
            meta="source"
            size={nodeSize}
            tone="mustard"
          />
          <HorizontalConnector />
          <ProcessNode
            density="compact"
            label={nodes[1]}
            size={nodeSize}
            step="02"
            tone={tone}
          />
          <HorizontalConnector tone="olive" />
          <OutputNode
            density="compact"
            label={nodes[2]}
            meta="result"
            size={nodeSize}
          />
        </div>
      )}
    </TemplateStage>
  );
}

export type DecisionTreeTemplateProps = TutorialTemplateProps & {
  choices?: [React.ReactNode, React.ReactNode, React.ReactNode?];
  prompt?: React.ReactNode;
};

export function DecisionTreeTemplate({
  choices = ["Now", "Later", "Skip"],
  className,
  density = "normal",
  prompt = "Choose",
  tone = "mustard",
  ...props
}: DecisionTreeTemplateProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;
  const visibleChoices = choices.filter(Boolean);
  const choiceSize: ComponentSize = portrait ? "lg" : "sm";

  return (
    <TemplateStage className={className} density={density} {...props}>
      <div
        className={cn(
          "grid w-full justify-items-center",
          portrait
            ? "min-h-[1360px] max-w-[760px] content-center gap-10"
            : "gap-0"
        )}
        data-slot="decision-tree-template"
      >
        <DecisionNode
          className={portrait ? undefined : "z-10"}
          density="compact"
          label={prompt}
          size={portrait ? "xl" : "md"}
          tone={tone}
        />
        {portrait ? (
          <VerticalConnector />
        ) : (
          <DecisionBranchConnector count={visibleChoices.length} />
        )}
        <div
          className={cn(
            "grid w-full items-center justify-items-center",
            portrait ? "grid-cols-1 gap-8" : "max-w-[1280px] grid-cols-3 gap-6"
          )}
        >
          {visibleChoices.map((choice, index) => (
            <FlowNode
              className={portrait ? "w-full max-w-[660px]" : undefined}
              density={portrait ? "normal" : "compact"}
              key={`decision-choice-${String(choice)}`}
              label={choice}
              meta={`0${index + 1}`}
              size={choiceSize}
              tone={choiceTone(index)}
            />
          ))}
        </div>
      </div>
    </TemplateStage>
  );
}

function choiceTone(index: number): OverlayTone {
  if (index === 0) {
    return "coral";
  }
  if (index === 1) {
    return "mustard";
  }
  return "olive";
}

function DecisionBranchConnector({ count }: { count: number }) {
  const safeCount = Math.max(2, count);
  const positions = Array.from(
    { length: safeCount },
    (_, index) => ((index + 0.5) / safeCount) * 100
  );
  const firstPosition = positions[0] ?? 25;
  const lastPosition = positions.at(-1) ?? 75;

  return (
    <div
      className="relative z-0 -mt-1 grid w-full max-w-[1280px] justify-items-center text-az-ink drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]"
      data-slot="decision-branch-connector"
    >
      <div className="h-10 w-2.5 rounded-full bg-current" />
      <div className="relative h-56 w-full">
        <div
          className="absolute top-0 h-2.5 rounded-full bg-current"
          style={{
            left: `${firstPosition}%`,
            right: `${100 - lastPosition}%`,
          }}
        />
        {positions.map((position) => (
          <div
            className="absolute top-0 h-56 w-2.5 -translate-x-1/2 rounded-full bg-current"
            key={`decision-branch-${position}`}
            style={{ left: `${position}%` }}
          />
        ))}
      </div>
    </div>
  );
}

export type ProcessPipelineTemplateProps = TutorialTemplateProps & {
  steps?: [React.ReactNode, React.ReactNode, React.ReactNode, React.ReactNode?];
};

export function ProcessPipelineTemplate({
  className,
  density = "normal",
  steps = ["Capture", "Extract", "Compose", "Render"],
  tone = "coral",
  ...props
}: ProcessPipelineTemplateProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;
  const visibleSteps = steps.filter(Boolean);

  if (portrait) {
    return (
      <TemplateStage className={className} density={density} {...props}>
        <TemplateStack
          className="min-h-[1360px] max-w-[760px] content-center gap-6"
          data-slot="process-pipeline-template"
        >
          {visibleSteps.map((step, index) => (
            <div
              className="grid w-full justify-items-center gap-5"
              key={`pipeline-step-${String(step)}`}
            >
              <ProcessNode
                className="w-full max-w-[660px]"
                density="normal"
                label={step}
                size="lg"
                step={String(index + 1).padStart(2, "0")}
                tone={index === visibleSteps.length - 1 ? "olive" : tone}
              />
              {index < visibleSteps.length - 1 ? <VerticalConnector /> : null}
            </div>
          ))}
        </TemplateStack>
      </TemplateStage>
    );
  }

  return (
    <TemplateStage className={className} density={density} {...props}>
      <div
        className="grid grid-flow-col items-center justify-items-center gap-5"
        data-slot="process-pipeline-template"
      >
        {visibleSteps.map((step, index) => (
          <div
            className="grid grid-flow-col items-center justify-items-center gap-5"
            key={`pipeline-step-${String(step)}`}
          >
            <ProcessNode
              density="compact"
              label={step}
              size="sm"
              step={String(index + 1).padStart(2, "0")}
              tone={index === visibleSteps.length - 1 ? "olive" : tone}
            />
            {index < visibleSteps.length - 1 ? <HorizontalConnector /> : null}
          </div>
        ))}
      </div>
    </TemplateStage>
  );
}

function VerticalConnector({ tone = "ink" }: { tone?: OverlayTone }) {
  return (
    <div
      className={cn(
        "grid justify-items-center text-current drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]",
        tone === "coral" && "text-az-coral",
        tone === "mustard" && "text-az-mustard",
        tone === "olive" && "text-az-olive",
        tone === "ink" && "text-az-ink"
      )}
      data-slot="vertical-template-connector"
    >
      <div className="h-12 w-2.5 rounded-full bg-current" />
      <div className="-mt-4 size-8 rotate-45 border-current border-r-7 border-b-7" />
    </div>
  );
}

function HorizontalConnector({ tone = "ink" }: { tone?: OverlayTone }) {
  return (
    <div
      className={cn(
        "flex w-28 items-center text-current drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]",
        tone === "coral" && "text-az-coral",
        tone === "mustard" && "text-az-mustard",
        tone === "olive" && "text-az-olive",
        tone === "ink" && "text-az-ink"
      )}
      data-slot="horizontal-template-connector"
    >
      <div className="h-2.5 flex-1 rounded-full bg-current" />
      <div className="-ml-4 size-8 rotate-45 border-current border-t-7 border-r-7" />
    </div>
  );
}

export type SystemMapTemplateProps = TutorialTemplateProps & {
  groupLabel?: React.ReactNode;
  nodes?: [React.ReactNode, React.ReactNode, React.ReactNode];
};

export function SystemMapTemplate({
  className,
  density = "normal",
  groupLabel = "System",
  nodes = ["Input", "Agent", "Output"],
  tone = "olive",
  ...props
}: SystemMapTemplateProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;
  const nodeSize: ComponentSize = portrait ? "md" : "sm";

  return (
    <TemplateStage className={className} density={density} {...props}>
      <SystemBoundary
        className={cn("w-full", portrait ? "max-w-[780px]" : "max-w-[1280px]")}
        data-slot="system-map-template"
        density="compact"
        label={groupLabel}
        tone={tone}
      >
        <div
          className={cn(
            "grid w-full items-center justify-items-center gap-8",
            portrait ? "grid-cols-1" : "grid-cols-[1fr_auto_1fr_auto_1fr]"
          )}
          data-slot="system-map-template-grid"
        >
          <FlowGroup
            className={portrait ? "w-full max-w-[620px]" : undefined}
            density="compact"
            label="source"
            tone="mustard"
          >
            <InputNode
              className={portrait ? "w-full" : undefined}
              density={portrait ? "normal" : "compact"}
              label={nodes[0]}
              size={nodeSize}
            />
          </FlowGroup>
          {portrait ? <VerticalConnector /> : <HorizontalConnector />}
          <FlowGroup
            className={portrait ? "w-full max-w-[620px]" : undefined}
            density="compact"
            label="process"
            tone="coral"
          >
            <FlowNode
              className={portrait ? "w-full" : undefined}
              density={portrait ? "normal" : "compact"}
              label={nodes[1]}
              size={nodeSize}
            />
          </FlowGroup>
          {portrait ? <VerticalConnector /> : <HorizontalConnector />}
          <FlowGroup
            className={portrait ? "w-full max-w-[620px]" : undefined}
            density="compact"
            label="result"
            tone="olive"
          >
            <OutputNode
              className={portrait ? "w-full" : undefined}
              density={portrait ? "normal" : "compact"}
              label={nodes[2]}
              size={nodeSize}
            />
          </FlowGroup>
        </div>
      </SystemBoundary>
    </TemplateStage>
  );
}

export type TimelineTemplateProps = TutorialTemplateProps & {
  activeIndex?: number;
  milestones?: [React.ReactNode, React.ReactNode, React.ReactNode];
};

export function TimelineTemplate({
  activeIndex = 1,
  className,
  density = "normal",
  milestones = ["Start", "Focus", "Ship"],
  tone = "coral",
  ...props
}: TimelineTemplateProps) {
  const { height, width } = useVideoConfig();
  const portrait = height > width;

  if (portrait) {
    return (
      <TemplateStage className={className} density={density} {...props}>
        <TemplateStack className="gap-5" data-slot="timeline-template">
          {milestones.map((milestone, index) => (
            <div
              className="grid w-full justify-items-center gap-5"
              key={`timeline-template-${String(milestone)}`}
            >
              <TimelineStep
                className="w-full max-w-[500px]"
                density="compact"
                label={milestone}
                size="sm"
                step={String(index + 1).padStart(2, "0")}
                tone={index === activeIndex ? "coral" : "olive"}
              />
              {index < milestones.length - 1 ? (
                <VerticalConnector
                  tone={index === activeIndex ? tone : "ink"}
                />
              ) : null}
            </div>
          ))}
        </TemplateStack>
      </TemplateStage>
    );
  }

  return (
    <TemplateStage className={className} density={density} {...props}>
      <div
        className="grid w-full items-center justify-items-center gap-10"
        data-slot="timeline-template"
      >
        <TimelineAxis tone={tone} />
        <div className="grid w-full grid-cols-3 justify-items-center gap-6">
          {milestones.map((milestone, index) => (
            <div
              className="grid justify-items-center gap-5"
              key={`timeline-template-${String(milestone)}`}
            >
              <MilestoneDot
                label={milestone}
                tone={index === activeIndex ? "coral" : "olive"}
              />
              <TimelineStep
                className="w-full max-w-[400px]"
                density="compact"
                label={milestone}
                size="sm"
                step={String(index + 1).padStart(2, "0")}
                tone={index === activeIndex ? "coral" : "olive"}
              />
            </div>
          ))}
        </div>
      </div>
    </TemplateStage>
  );
}
