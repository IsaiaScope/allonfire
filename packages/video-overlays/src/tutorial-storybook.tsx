import type React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import {
  AccentCard,
  AccentRule,
  AnimatedInOut,
  AnswerReveal,
  Arrow,
  BarPair,
  BarValue,
  BeforeAfter,
  Bracket,
  BranchSplit,
  BrowserFrame,
  CaptionText,
  CauseEffect,
  Checklist,
  ClickPulse,
  CodeBlock,
  CodeLine,
  CommandCard,
  ComparisonMatrix,
  ConceptCluster,
  ConceptNode,
  ConnectorArrow,
  ConnectorCurve,
  ConnectorElbow,
  ConnectorLine,
  CursorMark,
  DecisionFork,
  DecisionNode,
  DecisionTreeTemplate,
  DefinitionCard,
  DeltaArrow,
  DependencyLine,
  DeviceFrame,
  DoDontPair,
  DotMarker,
  DotPlot,
  FloatingCard,
  FloatingNote,
  FlowGroup,
  FlowNode,
  FlowSequenceTemplate,
  FocusFrame,
  FocusRing,
  FormulaStrip,
  GaugeArc,
  Headline,
  HighlightBar,
  IdeaCard,
  ImageCallout,
  ImageCard,
  ImageComparison,
  ImageCutout,
  InkCard,
  InkSurface,
  InputNode,
  Keycap,
  Kicker,
  LogoNode,
  LoopArrow,
  MaskedImageShape,
  MergePoint,
  MetricTile,
  MilestoneDot,
  MiniBarChart,
  MiniDashboardCard,
  MistakeFixPair,
  MonoLabel,
  NodeBadge,
  NumberBadge,
  OutputNode,
  PaperCard,
  PaperSurface,
  PinnedImage,
  PolaroidFrame,
  PrincipleCard,
  PriorityStack,
  ProcessNode,
  ProcessPipelineTemplate,
  ProgressBar,
  ProgressDots,
  ProgressRail,
  QuestionCard,
  QuoteCard,
  QuotePanel,
  RatioSplit,
  ResourceCard,
  ResultCard,
  ScoreRing,
  ScreenshotFrame,
  ShortcutCard,
  SoundCue,
  SparkLine,
  StackedBar,
  StampImage,
  StatusStamp,
  StepPill,
  StepStack,
  SuccessPanel,
  SvgIconFrame,
  SystemBoundary,
  SystemMapTemplate,
  TargetPin,
  TerminalFrame,
  TimelineAxis,
  TimelineStep,
  TimelineTemplate,
  TradeoffScale,
  type TutorialSfxCue,
  ValueChip,
  VersusPair,
  VintagePhotoFrame,
  WarningMark,
  WarningPanel,
} from "./tutorial-kit";

export type TutorialStoryAspect = "16x9" | "9x16";
export type TutorialStoryCategory = "component" | "template";
export type TutorialStoryId = string;

export type TutorialStoryDefinition = {
  category: TutorialStoryCategory;
  id: TutorialStoryId;
  name: string;
};

export type TutorialStorybookProps = {
  story: TutorialStoryId;
  sfxEnabled: boolean;
};

export const tutorialComponentStories: TutorialStoryDefinition[] = [
  { category: "component", id: "kicker", name: "Kicker" },
  { category: "component", id: "headline", name: "Headline" },
  { category: "component", id: "caption-text", name: "CaptionText" },
  { category: "component", id: "mono-label", name: "MonoLabel" },
  { category: "component", id: "number-badge", name: "NumberBadge" },
  { category: "component", id: "value-chip", name: "ValueChip" },
  { category: "component", id: "paper-surface", name: "PaperSurface" },
  { category: "component", id: "ink-surface", name: "InkSurface" },
  { category: "component", id: "floating-card", name: "FloatingCard" },
  { category: "component", id: "accent-rule", name: "AccentRule" },
  { category: "component", id: "focus-ring", name: "FocusRing" },
  { category: "component", id: "focus-frame", name: "FocusFrame" },
  { category: "component", id: "bracket", name: "Bracket" },
  { category: "component", id: "arrow", name: "Arrow" },
  { category: "component", id: "connector-line", name: "ConnectorLine" },
  { category: "component", id: "dot-marker", name: "DotMarker" },
  { category: "component", id: "target-pin", name: "TargetPin" },
  { category: "component", id: "highlight-bar", name: "HighlightBar" },
  { category: "component", id: "cursor-mark", name: "CursorMark" },
  { category: "component", id: "click-pulse", name: "ClickPulse" },
  { category: "component", id: "keycap", name: "Keycap" },
  { category: "component", id: "step-pill", name: "StepPill" },
  { category: "component", id: "progress-dots", name: "ProgressDots" },
  { category: "component", id: "progress-rail", name: "ProgressRail" },
  { category: "component", id: "code-line", name: "CodeLine" },
  { category: "component", id: "code-block", name: "CodeBlock" },
  { category: "component", id: "sound-cue", name: "SoundCue" },
  { category: "component", id: "animated-in-out", name: "AnimatedInOut" },
  { category: "component", id: "idea-card", name: "IdeaCard" },
  { category: "component", id: "versus-pair", name: "VersusPair" },
  { category: "component", id: "before-after", name: "BeforeAfter" },
  { category: "component", id: "decision-fork", name: "DecisionFork" },
  { category: "component", id: "timeline-step", name: "TimelineStep" },
  { category: "component", id: "quote-card", name: "QuoteCard" },
  { category: "component", id: "warning-mark", name: "WarningMark" },
  { category: "component", id: "formula-strip", name: "FormulaStrip" },
  { category: "component", id: "status-stamp", name: "StatusStamp" },
  { category: "component", id: "concept-node", name: "ConceptNode" },
  { category: "component", id: "flow-node", name: "FlowNode" },
  { category: "component", id: "process-node", name: "ProcessNode" },
  { category: "component", id: "decision-node", name: "DecisionNode" },
  { category: "component", id: "input-node", name: "InputNode" },
  { category: "component", id: "output-node", name: "OutputNode" },
  { category: "component", id: "connector-arrow", name: "ConnectorArrow" },
  { category: "component", id: "connector-elbow", name: "ConnectorElbow" },
  { category: "component", id: "connector-curve", name: "ConnectorCurve" },
  { category: "component", id: "branch-split", name: "BranchSplit" },
  { category: "component", id: "merge-point", name: "MergePoint" },
  { category: "component", id: "loop-arrow", name: "LoopArrow" },
  { category: "component", id: "dependency-line", name: "DependencyLine" },
  { category: "component", id: "node-badge", name: "NodeBadge" },
  { category: "component", id: "flow-group", name: "FlowGroup" },
  { category: "component", id: "system-boundary", name: "SystemBoundary" },
  { category: "component", id: "bar-value", name: "BarValue" },
  { category: "component", id: "bar-pair", name: "BarPair" },
  { category: "component", id: "mini-bar-chart", name: "MiniBarChart" },
  { category: "component", id: "progress-bar", name: "ProgressBar" },
  { category: "component", id: "delta-arrow", name: "DeltaArrow" },
  { category: "component", id: "metric-tile", name: "MetricTile" },
  { category: "component", id: "gauge-arc", name: "GaugeArc" },
  { category: "component", id: "dot-plot", name: "DotPlot" },
  { category: "component", id: "timeline-axis", name: "TimelineAxis" },
  { category: "component", id: "milestone-dot", name: "MilestoneDot" },
  { category: "component", id: "spark-line", name: "SparkLine" },
  { category: "component", id: "stacked-bar", name: "StackedBar" },
  { category: "component", id: "ratio-split", name: "RatioSplit" },
  { category: "component", id: "score-ring", name: "ScoreRing" },
  { category: "component", id: "definition-card", name: "DefinitionCard" },
  { category: "component", id: "cause-effect", name: "CauseEffect" },
  { category: "component", id: "tradeoff-scale", name: "TradeoffScale" },
  { category: "component", id: "priority-stack", name: "PriorityStack" },
  { category: "component", id: "step-stack", name: "StepStack" },
  { category: "component", id: "comparison-matrix", name: "ComparisonMatrix" },
  { category: "component", id: "checklist", name: "Checklist" },
  { category: "component", id: "do-dont-pair", name: "DoDontPair" },
  { category: "component", id: "principle-card", name: "PrincipleCard" },
  { category: "component", id: "question-card", name: "QuestionCard" },
  { category: "component", id: "answer-reveal", name: "AnswerReveal" },
  { category: "component", id: "mistake-fix-pair", name: "MistakeFixPair" },
  { category: "component", id: "concept-cluster", name: "ConceptCluster" },
  { category: "component", id: "svg-icon-frame", name: "SvgIconFrame" },
  { category: "component", id: "logo-node", name: "LogoNode" },
  { category: "component", id: "image-card", name: "ImageCard" },
  { category: "component", id: "image-cutout", name: "ImageCutout" },
  { category: "component", id: "screenshot-frame", name: "ScreenshotFrame" },
  { category: "component", id: "browser-frame", name: "BrowserFrame" },
  { category: "component", id: "terminal-frame", name: "TerminalFrame" },
  { category: "component", id: "device-frame", name: "DeviceFrame" },
  {
    category: "component",
    id: "vintage-photo-frame",
    name: "VintagePhotoFrame",
  },
  { category: "component", id: "polaroid-frame", name: "PolaroidFrame" },
  { category: "component", id: "stamp-image", name: "StampImage" },
  { category: "component", id: "pinned-image", name: "PinnedImage" },
  { category: "component", id: "image-comparison", name: "ImageComparison" },
  { category: "component", id: "image-callout", name: "ImageCallout" },
  { category: "component", id: "masked-image-shape", name: "MaskedImageShape" },
  { category: "component", id: "paper-card", name: "PaperCard" },
  { category: "component", id: "ink-card", name: "InkCard" },
  { category: "component", id: "accent-card", name: "AccentCard" },
  { category: "component", id: "floating-note", name: "FloatingNote" },
  { category: "component", id: "quote-panel", name: "QuotePanel" },
  { category: "component", id: "warning-panel", name: "WarningPanel" },
  { category: "component", id: "success-panel", name: "SuccessPanel" },
  { category: "component", id: "command-card", name: "CommandCard" },
  { category: "component", id: "shortcut-card", name: "ShortcutCard" },
  { category: "component", id: "resource-card", name: "ResourceCard" },
  { category: "component", id: "result-card", name: "ResultCard" },
  {
    category: "component",
    id: "mini-dashboard-card",
    name: "MiniDashboardCard",
  },
];

export const tutorialTemplateStories: TutorialStoryDefinition[] = [
  {
    category: "template",
    id: "flow-sequence",
    name: "FlowSequence",
  },
  {
    category: "template",
    id: "decision-tree",
    name: "DecisionTree",
  },
  {
    category: "template",
    id: "process-pipeline",
    name: "ProcessPipeline",
  },
  {
    category: "template",
    id: "system-map",
    name: "SystemMap",
  },
  {
    category: "template",
    id: "timeline",
    name: "Timeline",
  },
];

export const tutorialStoryAspects: TutorialStoryAspect[] = ["16x9", "9x16"];

export function tutorialStoryCompositionId(
  story: TutorialStoryDefinition,
  aspect: TutorialStoryAspect
) {
  return `${story.name}-${aspect}`;
}

export const TutorialStorybook: React.FC<TutorialStorybookProps> = ({
  sfxEnabled,
  story,
}) => {
  const { height, width } = useVideoConfig();
  const portrait = height > width;

  return (
    <AbsoluteFill
      className="atelier-zero-root az-paper-texture az-component-stage"
      data-orientation={portrait ? "portrait" : "landscape"}
    >
      <div
        className="az-component-stage-inner grid size-full place-items-center"
        data-slot="component-story-stage"
      >
        <StoryPreview sfxEnabled={sfxEnabled} story={story} />
      </div>
    </AbsoluteFill>
  );
};

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Story routing is intentionally centralized so Remotion composition registration stays explicit.
function StoryPreview({
  sfxEnabled,
  story,
}: {
  sfxEnabled: boolean;
  story: TutorialStoryId;
}) {
  const expandedStory = renderExpandedStory(story);
  if (expandedStory) {
    return expandedStory;
  }

  if (story === "headline") {
    return (
      <VariantGrid>
        <Headline size="xl">One idea</Headline>
        <Headline size="lg" tone="coral">
          Pay attention
        </Headline>
        <Headline align="center" size="md" tone="olive">
          Clear step
        </Headline>
      </VariantGrid>
    );
  }

  if (story === "caption-text") {
    return (
      <VariantStack>
        <CaptionText size="xl">Support speech.</CaptionText>
        <CaptionText density="compact" size="lg" tone="coral">
          One idea.
        </CaptionText>
        <CaptionText density="spacious" size="md" tone="olive">
          Clear signal.
        </CaptionText>
      </VariantStack>
    );
  }

  if (story === "mono-label") {
    return (
      <VariantGrid>
        <MonoLabel>chapter 02</MonoLabel>
        <MonoLabel density="spacious" tone="mustard">
          new value
        </MonoLabel>
        <MonoLabel density="compact" tone="olive">
          resolved
        </MonoLabel>
      </VariantGrid>
    );
  }

  if (story === "number-badge") {
    return (
      <VariantGrid>
        <NumberBadge label="first" value="01" />
        <NumberBadge label="score" tone="mustard" value="84" />
        <NumberBadge label="done" size="md" tone="olive" value="OK" />
      </VariantGrid>
    );
  }

  if (story === "value-chip") {
    return (
      <VariantGrid>
        <ValueChip label="steps" value="03" />
        <ValueChip label="faster" tone="mustard" value="2x" />
        <ValueChip label="ready" tone="olive" value="OK" />
      </VariantGrid>
    );
  }

  if (story === "kicker") {
    return (
      <VariantStack>
        <Kicker>motion</Kicker>
        <Kicker tone="mustard">quiet cue</Kicker>
        <Kicker tone="olive">target state</Kicker>
      </VariantStack>
    );
  }

  if (story === "paper-surface") {
    return (
      <VariantGrid>
        <PaperSurface>
          <Headline size="sm">Paper</Headline>
        </PaperSurface>
        <PaperSurface density="spacious" variant="translucent">
          <Headline size="sm">Overlay</Headline>
        </PaperSurface>
      </VariantGrid>
    );
  }

  if (story === "ink-surface") {
    return (
      <VariantGrid>
        <InkSurface>
          <Kicker>terminal</Kicker>
          <div className="mt-3 font-az-mono text-3xl">pnpm render</div>
        </InkSurface>
        <InkSurface density="spacious">
          <Headline className="text-az-paper" size="sm">
            Dark card
          </Headline>
        </InkSurface>
      </VariantGrid>
    );
  }

  if (story === "floating-card") {
    return (
      <VariantGrid>
        <FloatingCard>
          <Headline size="sm">Float</Headline>
        </FloatingCard>
        <FloatingCard density="spacious">
          <CaptionText size="md">Over video.</CaptionText>
        </FloatingCard>
      </VariantGrid>
    );
  }

  if (story === "accent-rule") {
    return (
      <VariantStack className="w-full">
        <AccentRule />
        <AccentRule glyph="01" tone="mustard" />
        <AccentRule glyph="OK" tone="olive" />
      </VariantStack>
    );
  }

  if (story === "focus-ring") {
    return (
      <VariantGrid>
        <FocusRing />
        <FocusRing size="md" tone="mustard" />
        <FocusRing size="xl" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "focus-frame") {
    return (
      <div className="az-focus-frame-story">
        <FocusFrame label="focus" />
        <FocusFrame size="md" tone="coral" />
        <FocusFrame label="done" size="sm" tone="olive" />
      </div>
    );
  }

  if (story === "bracket") {
    return (
      <VariantGrid>
        <Bracket />
        <Bracket orientation="right" tone="mustard" />
        <Bracket orientation="bottom" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "arrow") {
    return (
      <VariantStack>
        <Arrow />
        <Arrow direction="left" tone="mustard" />
        <Arrow direction="down" tone="olive" />
      </VariantStack>
    );
  }

  if (story === "connector-line") {
    return (
      <VariantStack className="w-full">
        <ConnectorLine />
        <ConnectorLine density="spacious" tone="coral" />
        <ConnectorLine density="compact" tone="olive" />
      </VariantStack>
    );
  }

  if (story === "dot-marker") {
    return (
      <VariantGrid>
        <DotMarker label="active" />
        <DotMarker label="wait" size="md" tone="mustard" />
        <DotMarker label="done" size="xl" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "target-pin") {
    return (
      <VariantGrid>
        <TargetPin label="here" />
        <TargetPin label="next" tone="mustard" />
        <TargetPin label="done" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "highlight-bar") {
    return (
      <VariantStack>
        <HighlightBar>Important</HighlightBar>
        <HighlightBar density="compact" tone="coral">
          Change this
        </HighlightBar>
        <HighlightBar density="spacious" tone="olive">
          Final result
        </HighlightBar>
      </VariantStack>
    );
  }

  if (story === "cursor-mark") {
    return (
      <VariantGrid>
        <CursorMark label="click" />
        <CursorMark label="drag" tone="mustard" />
        <CursorMark label="select" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "click-pulse") {
    return (
      <VariantGrid>
        <ClickPulse />
        <ClickPulse size="md" tone="mustard" />
        <ClickPulse size="xl" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "keycap") {
    return (
      <VariantGrid>
        <div className="flex items-center gap-5">
          <Keycap>Cmd</Keycap>
          <Keycap>K</Keycap>
        </div>
        <Keycap tone="coral">Enter</Keycap>
        <Keycap size="md" tone="olive">
          Esc
        </Keycap>
      </VariantGrid>
    );
  }

  if (story === "step-pill") {
    return (
      <VariantStack>
        <StepPill label="choose" value="01" />
        <StepPill label="run" tone="mustard" value="02" />
        <StepPill label="verify" tone="olive" value="03" />
      </VariantStack>
    );
  }

  if (story === "progress-dots") {
    return (
      <VariantStack>
        <ProgressDots active={1} total={4} />
        <ProgressDots active={2} tone="mustard" total={5} />
        <ProgressDots active={4} tone="olive" total={6} />
      </VariantStack>
    );
  }

  if (story === "progress-rail") {
    return (
      <VariantStack className="w-full">
        <ProgressRail active={1} total={4} />
        <ProgressRail active={2} tone="mustard" total={5} />
        <ProgressRail active={3} tone="olive" total={6} />
      </VariantStack>
    );
  }

  if (story === "code-line") {
    return (
      <InkSurface className="w-full max-w-4xl p-6" density="compact">
        <div className="grid w-full gap-5">
          <CodeLine lineNumber={1}>read(input)</CodeLine>
          <CodeLine active lineNumber={2}>
            focus(point)
          </CodeLine>
          <CodeLine lineNumber={3}>show(result)</CodeLine>
        </div>
      </InkSurface>
    );
  }

  if (story === "code-block") {
    return (
      <CodeBlock
        file="overlay.tsx"
        lines={["read(input)", "focus(point)", "show(result)"]}
      />
    );
  }

  if (story === "sound-cue") {
    return <SoundCuePreview enabled={sfxEnabled} />;
  }

  if (story === "animated-in-out") {
    return (
      <VariantGrid>
        <AnimatedInOut delay={6} kind="rise">
          <FloatingCard>
            <Headline size="sm">Rise</Headline>
          </FloatingCard>
        </AnimatedInOut>
        <AnimatedInOut delay={10} kind="scale">
          <FloatingCard>
            <Headline size="sm">Scale</Headline>
          </FloatingCard>
        </AnimatedInOut>
        <AnimatedInOut delay={14} kind="wipe">
          <FloatingCard>
            <Headline size="sm">Wipe</Headline>
          </FloatingCard>
        </AnimatedInOut>
      </VariantGrid>
    );
  }

  if (story === "idea-card") {
    return (
      <VariantStack>
        <IdeaCard kicker="idea">One concept.</IdeaCard>
        <IdeaCard kicker="watch" tone="mustard">
          Show the shift.
        </IdeaCard>
      </VariantStack>
    );
  }

  if (story === "versus-pair") {
    return (
      <VariantStack>
        <VersusPair left="Before" right="After" />
        <VersusPair left="Manual" right="Agent" tone="olive" />
      </VariantStack>
    );
  }

  if (story === "before-after") {
    return (
      <VariantStack className="w-full">
        <BeforeAfter after="Clear" before="Messy" />
        <BeforeAfter
          after="Reusable"
          before="One-off"
          orientation="vertical"
          tone="coral"
        />
      </VariantStack>
    );
  }

  if (story === "decision-fork") {
    return (
      <VariantStack>
        <DecisionFork left="Skip" prompt="Choose now" right="Build" />
        <DecisionFork
          left="Quick"
          prompt="Tradeoff"
          right="Deep"
          tone="coral"
        />
      </VariantStack>
    );
  }

  if (story === "timeline-step") {
    return (
      <VariantStack>
        <TimelineStep label="Pick" meta="start" step="01" />
        <TimelineStep label="Check" meta="verify" step="02" tone="olive" />
      </VariantStack>
    );
  }

  if (story === "quote-card") {
    return (
      <VariantStack>
        <QuoteCard attribution="rule">Less text.</QuoteCard>
        <QuoteCard attribution="rule" tone="olive">
          Bigger signal.
        </QuoteCard>
      </VariantStack>
    );
  }

  if (story === "warning-mark") {
    return (
      <VariantGrid>
        <WarningMark />
        <WarningMark label="risk" tone="coral" />
        <WarningMark label="pause" tone="olive" />
      </VariantGrid>
    );
  }

  if (story === "formula-strip") {
    return (
      <VariantStack>
        <FormulaStrip items={["input", "model", "answer"]} />
        <FormulaStrip items={["clip", "component", "overlay"]} tone="olive" />
      </VariantStack>
    );
  }

  if (story === "status-stamp") {
    return (
      <VariantGrid>
        <StatusStamp>Done</StatusStamp>
        <StatusStamp tone="mustard">Wait</StatusStamp>
        <StatusStamp tone="coral">Risk</StatusStamp>
      </VariantGrid>
    );
  }

  if (story === "concept-node") {
    return (
      <VariantGrid>
        <ConceptNode label="Prompt" meta="input" />
        <ConceptNode label="Agent" meta="process" tone="mustard" />
        <ConceptNode label="Video" meta="output" tone="olive" />
      </VariantGrid>
    );
  }

  return null;
}

function renderExpandedStory(story: TutorialStoryId) {
  switch (story) {
    case "flow-node":
      return (
        <VariantGrid>
          <FlowNode label="Prompt" />
          <FlowNode label="Tool" tone="mustard" />
          <FlowNode label="Result" tone="olive" />
        </VariantGrid>
      );
    case "process-node":
      return (
        <VariantStack>
          <ProcessNode label="Pick" step="01" />
          <ProcessNode label="Build" step="02" tone="mustard" />
          <ProcessNode label="Check" step="03" tone="olive" />
        </VariantStack>
      );
    case "decision-node":
      return (
        <VariantGrid>
          <DecisionNode label="Ship" />
          <DecisionNode label="Wait" tone="coral" />
          <DecisionNode label="Retry" tone="olive" />
        </VariantGrid>
      );
    case "input-node":
      return (
        <VariantGrid>
          <InputNode label="Input" />
          <InputNode label="Clip" />
          <InputNode label="Prompt" />
        </VariantGrid>
      );
    case "output-node":
      return (
        <VariantGrid>
          <OutputNode label="Answer" />
          <OutputNode label="Video" />
          <OutputNode label="Done" />
        </VariantGrid>
      );
    case "connector-arrow":
      return (
        <VariantStack>
          <ConnectorArrow />
          <ConnectorArrow direction="left" tone="mustard" />
          <ConnectorArrow direction="down" tone="olive" />
        </VariantStack>
      );
    case "connector-elbow":
      return (
        <VariantGrid>
          <ConnectorElbow />
          <ConnectorElbow direction="down-left" tone="coral" />
          <ConnectorElbow direction="up-right" tone="olive" />
        </VariantGrid>
      );
    case "connector-curve":
      return (
        <VariantStack>
          <ConnectorCurve />
          <ConnectorCurve tone="mustard" />
          <ConnectorCurve density="spacious" tone="olive" />
        </VariantStack>
      );
    case "branch-split":
      return <BranchSplit labels={["Fast", "Deep", "Skip"]} />;
    case "merge-point":
      return (
        <VariantGrid>
          <MergePoint />
          <MergePoint label="join" tone="coral" />
          <MergePoint label="done" tone="olive" />
        </VariantGrid>
      );
    case "loop-arrow":
      return (
        <VariantGrid>
          <LoopArrow />
          <LoopArrow label="again" tone="coral" />
          <LoopArrow label="fix" tone="olive" />
        </VariantGrid>
      );
    case "dependency-line":
      return (
        <VariantStack className="w-full">
          <DependencyLine />
          <DependencyLine tone="coral" />
          <DependencyLine density="spacious" tone="olive" />
        </VariantStack>
      );
    case "node-badge":
      return (
        <VariantGrid>
          <NodeBadge>new</NodeBadge>
          <NodeBadge tone="mustard">wait</NodeBadge>
          <NodeBadge tone="olive">ok</NodeBadge>
        </VariantGrid>
      );
    case "flow-group":
      return (
        <FlowGroup label="group">
          <FlowNode label="A" size="sm" />
          <FlowNode label="B" size="sm" tone="olive" />
        </FlowGroup>
      );
    case "system-boundary":
      return (
        <SystemBoundary label="system">
          <FlowNode label="Agent" tone="olive" />
        </SystemBoundary>
      );
    case "bar-value":
      return (
        <VariantStack className="w-full">
          <BarValue label="progress" />
          <BarValue label="quality" tone="olive" value={86} />
        </VariantStack>
      );
    case "bar-pair":
      return <BarPair />;
    case "mini-bar-chart":
      return <MiniBarChart />;
    case "progress-bar":
      return (
        <VariantStack className="w-full">
          <ProgressBar value={42} />
          <ProgressBar tone="olive" value={82} />
        </VariantStack>
      );
    case "delta-arrow":
      return (
        <VariantGrid>
          <DeltaArrow />
          <DeltaArrow direction="down" label="-12%" tone="coral" />
          <DeltaArrow label="+2x" tone="olive" />
        </VariantGrid>
      );
    case "metric-tile":
      return (
        <VariantGrid>
          <MetricTile label="lift" value="2x" />
          <MetricTile label="score" tone="mustard" value="84" />
          <MetricTile label="done" tone="olive" value="OK" />
        </VariantGrid>
      );
    case "gauge-arc":
      return (
        <VariantGrid>
          <GaugeArc />
          <GaugeArc tone="mustard" value={42} />
          <GaugeArc tone="olive" value={88} />
        </VariantGrid>
      );
    case "dot-plot":
      return <DotPlot />;
    case "timeline-axis":
      return (
        <VariantStack className="w-full">
          <TimelineAxis />
          <TimelineAxis tone="olive" />
        </VariantStack>
      );
    case "milestone-dot":
      return (
        <VariantGrid>
          <MilestoneDot label="start" />
          <MilestoneDot label="ship" tone="mustard" />
          <MilestoneDot label="done" tone="olive" />
        </VariantGrid>
      );
    case "spark-line":
      return (
        <VariantStack className="w-full">
          <SparkLine />
          <SparkLine tone="coral" values={[72, 48, 64, 40, 88]} />
        </VariantStack>
      );
    case "stacked-bar":
      return <StackedBar />;
    case "ratio-split":
      return <RatioSplit left={70} />;
    case "score-ring":
      return (
        <VariantGrid>
          <ScoreRing />
          <ScoreRing tone="mustard" value={64} />
          <ScoreRing tone="coral" value={12} />
        </VariantGrid>
      );
    case "definition-card":
      return <DefinitionCard definition="Reusable block" term="component" />;
    case "cause-effect":
      return <CauseEffect cause="Input" effect="Output" />;
    case "tradeoff-scale":
      return <TradeoffScale left="Fast" right="Deep" />;
    case "priority-stack":
      return <PriorityStack />;
    case "step-stack":
      return <StepStack items={["Read", "Focus", "Show"]} />;
    case "comparison-matrix":
      return <ComparisonMatrix />;
    case "checklist":
      return <Checklist />;
    case "do-dont-pair":
      return <DoDontPair />;
    case "principle-card":
      return <PrincipleCard>One signal.</PrincipleCard>;
    case "question-card":
      return <QuestionCard>Why now</QuestionCard>;
    case "answer-reveal":
      return <AnswerReveal answer="Focus" question="Problem" />;
    case "mistake-fix-pair":
      return <MistakeFixPair />;
    case "concept-cluster":
      return <ConceptCluster />;
    case "svg-icon-frame":
      return (
        <VariantGrid>
          <SvgIconFrame />
          <SvgIconFrame label="logo" tone="mustard" />
          <SvgIconFrame label="asset" tone="olive" />
        </VariantGrid>
      );
    case "logo-node":
      return (
        <VariantGrid>
          <LogoNode />
          <LogoNode label="AI" tone="coral" />
          <LogoNode label="app" tone="olive" />
        </VariantGrid>
      );
    case "image-card":
      return <ImageCard label="image" />;
    case "image-cutout":
      return <ImageCutout label="cutout" />;
    case "screenshot-frame":
      return <ScreenshotFrame label="screen" />;
    case "browser-frame":
      return <BrowserFrame label="browser" />;
    case "terminal-frame":
      return <TerminalFrame />;
    case "device-frame":
      return (
        <VariantGrid>
          <DeviceFrame label="mobile" />
          <DeviceFrame device="tablet" label="tablet" tone="olive" />
        </VariantGrid>
      );
    case "vintage-photo-frame":
      return <VintagePhotoFrame />;
    case "polaroid-frame":
      return <PolaroidFrame />;
    case "stamp-image":
      return <StampImage />;
    case "pinned-image":
      return <PinnedImage label="pin" />;
    case "image-comparison":
      return <ImageComparison />;
    case "image-callout":
      return <ImageCallout />;
    case "masked-image-shape":
      return (
        <VariantGrid>
          <MaskedImageShape />
          <MaskedImageShape label="crop" shape="rounded" />
        </VariantGrid>
      );
    case "paper-card":
      return <PaperCard label="note">Focus</PaperCard>;
    case "ink-card":
      return <InkCard label="dark">Signal</InkCard>;
    case "accent-card":
      return (
        <VariantGrid>
          <AccentCard>Alert</AccentCard>
          <AccentCard tone="mustard">Wait</AccentCard>
          <AccentCard tone="olive">Done</AccentCard>
        </VariantGrid>
      );
    case "floating-note":
      return <FloatingNote>Remember</FloatingNote>;
    case "quote-panel":
      return <QuotePanel attribution="rule">Less text.</QuotePanel>;
    case "warning-panel":
      return <WarningPanel />;
    case "success-panel":
      return <SuccessPanel />;
    case "command-card":
      return <CommandCard />;
    case "shortcut-card":
      return <ShortcutCard />;
    case "resource-card":
      return <ResourceCard />;
    case "result-card":
      return <ResultCard />;
    case "mini-dashboard-card":
      return <MiniDashboardCard />;
    case "flow-sequence":
      return <FlowSequenceTemplate />;
    case "decision-tree":
      return <DecisionTreeTemplate />;
    case "process-pipeline":
      return <ProcessPipelineTemplate />;
    case "system-map":
      return <SystemMapTemplate />;
    case "timeline":
      return <TimelineTemplate />;
    default:
      return null;
  }
}

function VariantGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`az-component-grid ${className ?? ""}`}
      data-slot="story-variant-grid"
    >
      {children}
    </div>
  );
}

function VariantStack({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`az-component-stack ${className ?? ""}`}
      data-slot="story-variant-stack"
    >
      {children}
    </div>
  );
}

function SoundCuePreview({ enabled }: { enabled: boolean }) {
  const cues: TutorialSfxCue[] = [
    "soft-whoosh",
    "paper-tick",
    "quiet-pop",
    "ui-click",
    "page-turn",
  ];

  return (
    <VariantStack>
      {cues.map((cue, index) => (
        <SoundCue cue={cue} enabled={enabled} from={index * 18} key={cue} />
      ))}
      {cues.map((cue, index) => (
        <MonoLabel key={cue} tone={index % 2 === 0 ? "coral" : "mustard"}>
          {String(index + 1).padStart(2, "0")}
        </MonoLabel>
      ))}
    </VariantStack>
  );
}
