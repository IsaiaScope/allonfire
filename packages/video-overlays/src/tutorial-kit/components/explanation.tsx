import type React from "react";
import { cn } from "../lib/cn";
import {
  type OverlayTone,
  toneBgClass,
  toneBorderClass,
  toneTextClass,
} from "../lib/tones";
import type { ComponentDensity, ComponentSize } from "./types";

type BaseComponentProps = React.ComponentProps<"div"> & {
  density?: ComponentDensity;
  size?: ComponentSize;
  tone?: OverlayTone;
};

export type DefinitionCardProps = BaseComponentProps & {
  definition: React.ReactNode;
  term: React.ReactNode;
};

export function DefinitionCard({
  className,
  definition,
  term,
  tone = "coral",
  ...props
}: DefinitionCardProps) {
  return (
    <Panel
      className={className}
      data-slot="definition-card"
      tone={tone}
      {...props}
    >
      <div
        className={cn(
          "font-az-mono font-semibold text-2xl uppercase tracking-[0.16em]",
          toneTextClass(tone)
        )}
      >
        {term}
      </div>
      <div className="mt-5 font-az-sans font-extrabold text-6xl text-az-ink leading-none">
        {definition}
      </div>
    </Panel>
  );
}

export type CauseEffectProps = BaseComponentProps & {
  cause: React.ReactNode;
  effect: React.ReactNode;
};

export function CauseEffect({
  cause,
  className,
  effect,
  tone = "coral",
  ...props
}: CauseEffectProps) {
  return (
    <div
      className={cn(
        "grid w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center gap-8",
        className
      )}
      data-slot="cause-effect"
      {...props}
    >
      <Panel tone="ink">
        <Big>{cause}</Big>
      </Panel>
      <div className={cn("h-5 w-28 rounded-full", toneBgClass(tone))} />
      <Panel tone={tone}>
        <Big>{effect}</Big>
      </Panel>
    </div>
  );
}

export type TradeoffScaleProps = BaseComponentProps & {
  left: React.ReactNode;
  right: React.ReactNode;
};

export function TradeoffScale({
  className,
  left,
  right,
  tone = "mustard",
  ...props
}: TradeoffScaleProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl gap-8", className)}
      data-slot="tradeoff-scale"
      {...props}
    >
      <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-8">
        <Big className="text-right">{left}</Big>
        <div
          className={cn(
            "az-video-shadow size-24 rounded-full border-4 bg-az-bone",
            toneBorderClass(tone)
          )}
        />
        <Big>{right}</Big>
      </div>
      <div className="h-5 rounded-full bg-[linear-gradient(90deg,var(--color-az-coral),var(--color-az-mustard),var(--color-az-olive))]" />
    </div>
  );
}

export type PriorityStackProps = BaseComponentProps & {
  items?: React.ReactNode[];
};

export function PriorityStack({
  className,
  items = ["Now", "Next", "Later"],
  tone = "coral",
  ...props
}: PriorityStackProps) {
  return (
    <div
      className={cn("grid w-full max-w-3xl gap-5", className)}
      data-slot="priority-stack"
      {...props}
    >
      {items.slice(0, 4).map((item, index) => (
        <Panel
          className={cn(index === 0 && "scale-[1.04]")}
          key={`priority-${String(item)}`}
          tone={index === 0 ? tone : "ink"}
        >
          <div className="flex items-center gap-6">
            <Badge tone={index === 0 ? tone : "ink"}>
              {String(index + 1).padStart(2, "0")}
            </Badge>
            <Big>{item}</Big>
          </div>
        </Panel>
      ))}
    </div>
  );
}

export type StepStackProps = PriorityStackProps;

export function StepStack(props: StepStackProps) {
  return <PriorityStack {...props} data-slot="step-stack" />;
}

export type ComparisonMatrixProps = BaseComponentProps & {
  cells?: React.ReactNode[];
};

export function ComparisonMatrix({
  cells = ["Fast", "Cheap", "Deep", "Stable"],
  className,
  tone = "coral",
  ...props
}: ComparisonMatrixProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid w-full max-w-4xl grid-cols-2 overflow-hidden rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        className
      )}
      data-slot="comparison-matrix"
      {...props}
    >
      {cells.slice(0, 4).map((cell, index) => (
        <div
          className={cn(
            "grid min-h-44 place-items-center border-az-ink/14 p-8 font-az-sans font-extrabold text-5xl text-az-ink",
            index < 2 && "border-b-2",
            index % 2 === 0 && "border-r-2",
            index === 3 && toneTextClass(tone)
          )}
          key={`comparison-${String(cell)}`}
        >
          {cell}
        </div>
      ))}
    </div>
  );
}

export type ChecklistProps = BaseComponentProps & {
  items?: React.ReactNode[];
};

export function Checklist({
  className,
  items = ["Pick", "Build", "Check"],
  tone = "olive",
  ...props
}: ChecklistProps) {
  return (
    <Panel
      className={cn("w-full max-w-3xl", className)}
      data-slot="checklist"
      tone={tone}
      {...props}
    >
      <div className="grid gap-6">
        {items.slice(0, 3).map((item) => (
          <div
            className="flex items-center gap-5"
            key={`check-${String(item)}`}
          >
            <span
              className={cn(
                "grid size-12 place-items-center rounded-full font-az-sans font-extrabold text-2xl text-az-paper",
                toneBgClass(tone)
              )}
            >
              OK
            </span>
            <Big>{item}</Big>
          </div>
        ))}
      </div>
    </Panel>
  );
}

export type DoDontPairProps = BaseComponentProps & {
  doLabel?: React.ReactNode;
  dontLabel?: React.ReactNode;
};

export function DoDontPair({
  className,
  doLabel = "Do",
  dontLabel = "Avoid",
  ...props
}: DoDontPairProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl grid-cols-2 gap-8", className)}
      data-slot="do-dont-pair"
      {...props}
    >
      <Panel tone="olive">
        <Big>{doLabel}</Big>
      </Panel>
      <Panel tone="coral">
        <Big>{dontLabel}</Big>
      </Panel>
    </div>
  );
}

export type PrincipleCardProps = BaseComponentProps & {
  children: React.ReactNode;
};

export function PrincipleCard({
  children,
  className,
  tone = "ink",
  ...props
}: PrincipleCardProps) {
  return (
    <Panel
      className={className}
      data-slot="principle-card"
      tone={tone}
      {...props}
    >
      <Big>{children}</Big>
    </Panel>
  );
}

export type QuestionCardProps = PrincipleCardProps;

export function QuestionCard({
  children,
  className,
  tone = "mustard",
  ...props
}: QuestionCardProps) {
  return (
    <Panel
      className={className}
      data-slot="question-card"
      tone={tone}
      {...props}
    >
      <Big>{children}?</Big>
    </Panel>
  );
}

export type AnswerRevealProps = BaseComponentProps & {
  answer: React.ReactNode;
  question: React.ReactNode;
};

export function AnswerReveal({
  answer,
  className,
  question,
  tone = "olive",
  ...props
}: AnswerRevealProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl gap-8", className)}
      data-slot="answer-reveal"
      {...props}
    >
      <Panel tone="ink">
        <Big>{question}?</Big>
      </Panel>
      <Panel tone={tone}>
        <Big>{answer}</Big>
      </Panel>
    </div>
  );
}

export type MistakeFixPairProps = BaseComponentProps & {
  fix?: React.ReactNode;
  mistake?: React.ReactNode;
};

export function MistakeFixPair({
  className,
  fix = "Fix",
  mistake = "Mistake",
  ...props
}: MistakeFixPairProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl grid-cols-2 gap-8", className)}
      data-slot="mistake-fix-pair"
      {...props}
    >
      <Panel tone="coral">
        <Big>{mistake}</Big>
      </Panel>
      <Panel tone="olive">
        <Big>{fix}</Big>
      </Panel>
    </div>
  );
}

export type ConceptClusterProps = BaseComponentProps & {
  center?: React.ReactNode;
  nodes?: React.ReactNode[];
};

export function ConceptCluster({
  center = "Core",
  className,
  nodes = ["Input", "Tool", "Output"],
  tone = "coral",
  ...props
}: ConceptClusterProps) {
  return (
    <div
      className={cn("relative grid size-168 place-items-center", className)}
      data-slot="concept-cluster"
      {...props}
    >
      <Panel className="relative z-10 min-w-60" tone={tone}>
        <Big>{center}</Big>
      </Panel>
      {nodes.slice(0, 4).map((node, index) => (
        <Panel
          className={cn("absolute min-w-52", clusterPosition(index))}
          key={`cluster-${String(node)}`}
          tone={clusterTone(index)}
        >
          <div className="font-az-sans font-extrabold text-4xl text-az-ink">
            {node}
          </div>
        </Panel>
      ))}
    </div>
  );
}

function Panel({
  children,
  className,
  tone,
  ...props
}: React.ComponentProps<"div"> & { tone: OverlayTone }) {
  return (
    <div
      className={cn(
        "az-video-shadow rounded-[8px] border-4 bg-az-bone p-10",
        toneBorderClass(tone),
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}

function Badge({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: OverlayTone;
}) {
  return (
    <span
      className={cn(
        "rounded-full px-5 py-3 font-az-mono font-semibold text-az-paper text-xl uppercase tracking-[0.16em]",
        toneBgClass(tone)
      )}
    >
      {children}
    </span>
  );
}

function Big({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "font-az-sans font-extrabold text-6xl text-az-ink leading-none",
        className
      )}
    >
      {children}
    </div>
  );
}

function clusterPosition(index: number) {
  if (index === 0) {
    return "left-0 top-1/2 -translate-y-1/2";
  }
  if (index === 1) {
    return "right-0 top-1/2 -translate-y-1/2";
  }
  if (index === 2) {
    return "left-1/2 top-0 -translate-x-1/2";
  }
  return "bottom-0 left-1/2 -translate-x-1/2";
}

function clusterTone(index: number): OverlayTone {
  if (index === 0) {
    return "coral";
  }

  if (index === 1) {
    return "mustard";
  }

  return "olive";
}
