import type React from "react";
import { PaperCard } from "../atoms/cards";
import {
  BarPair,
  MetricTile,
  MiniBarChart,
  SparkLine,
  TimelineAxis,
} from "../atoms/charts";
import { FormulaStrip, TimelineStep, VersusPair } from "../atoms/concept";
import { ConceptCluster, DoDontPair } from "../atoms/explanation";
import {
  ConnectorArrow,
  ConnectorElbow,
  DecisionNode,
  FlowNode,
  InputNode,
  OutputNode,
  ProcessNode,
} from "../atoms/flow";
import { ImageCallout, ScreenshotFrame } from "../atoms/media";
import { CaptionBand } from "../blocks/caption-band";
import { CodeWindow } from "../blocks/code-window";
import { ProgressRail } from "../blocks/progress-rail";
import { cn } from "../lib/cn";

export type TutorialPatternProps = React.ComponentProps<"div">;

export function LinearFlowDiagram({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn(
        "flex w-full max-w-[1500px] items-center justify-center gap-6",
        className
      )}
      data-slot="linear-flow-diagram"
      {...props}
    >
      <InputNode label="Input" size="sm" />
      <ConnectorArrow size="sm" />
      <ProcessNode label="Model" size="sm" step="02" tone="mustard" />
      <ConnectorArrow size="sm" tone="olive" />
      <OutputNode label="Output" size="sm" />
    </div>
  );
}

export function BranchingDecisionFlow({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("grid justify-items-center gap-8", className)}
      data-slot="branching-decision-flow"
      {...props}
    >
      <DecisionNode label="Ship" size="md" />
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <FlowNode label="Now" size="sm" tone="coral" />
        <ConnectorElbow size="sm" tone="ink" />
        <FlowNode label="Later" size="sm" tone="olive" />
      </div>
    </div>
  );
}

export function BeforeAfterDiagram(props: TutorialPatternProps) {
  return <VersusPair left="Before" right="After" {...props} />;
}

export function InputProcessOutput(props: TutorialPatternProps) {
  return (
    <FormulaStrip items={["input", "process", "output"]} size="xl" {...props} />
  );
}

export function ThreeStepExplainer({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("grid gap-6", className)}
      data-slot="three-step-explainer"
      {...props}
    >
      <TimelineStep label="Pick" step="01" />
      <TimelineStep label="Build" step="02" tone="mustard" />
      <TimelineStep label="Check" step="03" tone="olive" />
    </div>
  );
}

export function ToolchainFlow(props: TutorialPatternProps) {
  return <LinearFlowDiagram {...props} data-slot="toolchain-flow" />;
}

export function ModelPipeline(props: TutorialPatternProps) {
  return <LinearFlowDiagram {...props} data-slot="model-pipeline" />;
}

export function ProblemSolutionResult({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl grid-cols-3 gap-6", className)}
      data-slot="problem-solution-result"
      {...props}
    >
      <PaperCard label="problem" tone="coral">
        Messy
      </PaperCard>
      <PaperCard label="solution" tone="mustard">
        Focus
      </PaperCard>
      <PaperCard label="result" tone="olive">
        Clear
      </PaperCard>
    </div>
  );
}

export function ChartCallout({ className, ...props }: TutorialPatternProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-5xl grid-cols-[1fr_auto] items-center gap-10",
        className
      )}
      data-slot="chart-callout"
      {...props}
    >
      <MiniBarChart />
      <MetricTile label="lift" value="2x" />
    </div>
  );
}

export function ScreenshotWithAnnotations({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("relative", className)}
      data-slot="screenshot-with-annotations"
      {...props}
    >
      <ScreenshotFrame label="app" />
      <ImageCallout
        callout="focus"
        className="absolute -top-16 -right-16 w-md"
      />
    </div>
  );
}

export function ImageWithConceptNodes({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-6xl grid-cols-[1fr_0.8fr] items-center gap-10",
        className
      )}
      data-slot="image-with-concept-nodes"
      {...props}
    >
      <ScreenshotFrame label="visual" />
      <ConceptCluster center="Idea" nodes={["Input", "Tool", "Result"]} />
    </div>
  );
}

export function TimelineExplainer({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl gap-8", className)}
      data-slot="timeline-explainer"
      {...props}
    >
      <TimelineAxis />
      <div className="grid grid-cols-3 gap-6">
        <TimelineStep label="Start" step="01" />
        <TimelineStep label="Run" step="02" tone="mustard" />
        <TimelineStep label="Done" step="03" tone="olive" />
      </div>
    </div>
  );
}

export function ComparisonOverlay(props: TutorialPatternProps) {
  return <DoDontPair doLabel="Do" dontLabel="Avoid" {...props} />;
}

export function CodePlusResult({ className, ...props }: TutorialPatternProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-5xl grid-cols-[1fr_auto] items-center gap-8",
        className
      )}
      data-slot="code-plus-result"
      {...props}
    >
      <CodeWindow
        command="run"
        file="overlay.tsx"
        lines={["read(input)", "show(result)"]}
      />
      <MetricTile label="ready" tone="olive" value="OK" />
    </div>
  );
}

export function NarrationSupportCard({
  className,
  ...props
}: TutorialPatternProps) {
  return (
    <div
      className={cn("grid w-full max-w-4xl gap-8", className)}
      data-slot="narration-support-card"
      {...props}
    >
      <CaptionBand emphasis="focus">One idea.</CaptionBand>
      <ProgressRail active={1} total={3} />
    </div>
  );
}

export function ChartTrendPattern(props: TutorialPatternProps) {
  return (
    <div
      className="grid w-full max-w-5xl gap-8"
      data-slot="chart-trend-pattern"
      {...props}
    >
      <SparkLine />
      <BarPair />
    </div>
  );
}
