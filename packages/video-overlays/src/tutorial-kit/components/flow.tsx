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

type BaseSvgComponentProps = React.ComponentProps<"svg"> & {
  density?: ComponentDensity;
  size?: ComponentSize;
  tone?: OverlayTone;
};

export type FlowNodeProps = BaseComponentProps & {
  label: React.ReactNode;
  meta?: React.ReactNode;
};

export function FlowNode({
  className,
  density = "normal",
  label,
  meta,
  size = "lg",
  tone = "coral",
  ...props
}: FlowNodeProps) {
  return (
    <div
      className={cn(
        "az-video-shadow inline-grid min-w-88 place-items-center rounded-[8px] border-4 bg-az-bone text-center",
        densityClass(density),
        size === "sm" && "min-w-[16rem]",
        size === "md" && "min-w-76",
        size === "xl" && "min-w-md",
        toneBorderClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="flow-node"
      {...props}
    >
      <div
        className={cn(
          "font-az-sans font-extrabold text-az-ink leading-none",
          textSize(size)
        )}
      >
        {label}
      </div>
      {meta ? <Meta tone={tone}>{meta}</Meta> : null}
    </div>
  );
}

export type ProcessNodeProps = FlowNodeProps & {
  step?: React.ReactNode;
};

export function ProcessNode({
  label,
  step = "01",
  tone = "coral",
  ...props
}: ProcessNodeProps) {
  return (
    <FlowNode
      label={
        <span className="inline-flex items-center gap-5">
          <Badge tone={tone}>{step}</Badge>
          {label}
        </span>
      }
      tone={tone}
      {...props}
    />
  );
}

export type DecisionNodeProps = BaseComponentProps & {
  label: React.ReactNode;
};

export function DecisionNode({
  className,
  density = "normal",
  label,
  size = "lg",
  tone = "mustard",
  ...props
}: DecisionNodeProps) {
  return (
    <div
      className={cn(
        "relative grid place-items-center",
        size === "sm" && "size-56",
        size === "md" && "size-72",
        size === "lg" && "size-96",
        size === "xl" && "size-120",
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="decision-node"
      {...props}
    >
      <div
        className={cn(
          "az-video-shadow absolute inset-[12%] rotate-45 rounded-[8px] border-4 bg-az-bone",
          toneBorderClass(tone)
        )}
      />
      <div
        className={cn(
          "relative z-10 max-w-[7ch] text-center font-az-sans font-extrabold text-az-ink leading-none",
          textSize(size)
        )}
      >
        {label}
      </div>
    </div>
  );
}

export function InputNode(props: FlowNodeProps) {
  return <FlowNode tone="mustard" {...props} data-slot="input-node" />;
}

export function OutputNode(props: FlowNodeProps) {
  return <FlowNode tone="olive" {...props} data-slot="output-node" />;
}

export type ConnectorArrowProps = BaseComponentProps & {
  direction?: "right" | "left" | "up" | "down";
};

export function ConnectorArrow({
  className,
  direction = "right",
  density = "normal",
  size = "lg",
  tone = "ink",
  ...props
}: ConnectorArrowProps) {
  const rotate = connectorArrowRotationClass(direction);

  return (
    <div
      className={cn(
        "flex items-center text-current drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]",
        widthSize(size),
        rotate,
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-direction={direction}
      data-size={size}
      data-slot="connector-arrow"
      {...props}
    >
      <div
        className={cn("flex-1 rounded-full bg-current", lineHeight(density))}
      />
      <div className="size-12 rotate-45 border-current border-t-12 border-r-12" />
    </div>
  );
}

export type ConnectorElbowProps = BaseComponentProps & {
  direction?: "down-right" | "down-left" | "up-right" | "up-left";
};

export function ConnectorElbow({
  className,
  direction = "down-right",
  density = "normal",
  size = "lg",
  tone = "ink",
  ...props
}: ConnectorElbowProps) {
  const flipX = direction.endsWith("left");
  const flipY = direction.startsWith("up");
  return (
    <div
      className={cn(
        "border-current drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]",
        size === "sm" && "size-40",
        size === "md" && "size-56",
        size === "lg" && "size-72",
        size === "xl" && "size-96",
        density === "compact" && "border-r-8 border-b-8",
        density === "normal" && "border-r-12 border-b-12",
        density === "spacious" && "border-r-16 border-b-16",
        flipX && "-scale-x-100",
        flipY && "-scale-y-100",
        toneTextClass(tone),
        className
      )}
      data-direction={direction}
      data-slot="connector-elbow"
      {...props}
    />
  );
}

export type ConnectorCurveProps = BaseSvgComponentProps;

export function ConnectorCurve({
  className,
  density = "normal",
  size = "lg",
  tone = "coral",
  ...props
}: ConnectorCurveProps) {
  const strokeWidth = connectorStrokeWidth(density, {
    compact: 8,
    normal: 12,
    spacious: 16,
  });

  return (
    <svg
      aria-label="Connector curve"
      className={cn(
        widthSize(size),
        "overflow-visible drop-shadow-[0_14px_18px_rgba(21,20,15,0.16)]",
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="connector-curve"
      fill="none"
      role="img"
      viewBox="0 0 420 160"
      {...props}
    >
      <path
        d="M18 130 C 120 18, 280 18, 402 130"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth={strokeWidth}
      />
    </svg>
  );
}

export type BranchSplitProps = BaseComponentProps & {
  labels?: [React.ReactNode, React.ReactNode, React.ReactNode?];
};

export function BranchSplit({
  className,
  labels = ["A", "B"],
  size = "lg",
  tone = "coral",
  ...props
}: BranchSplitProps) {
  const options = labels.filter(Boolean);

  return (
    <div
      className={cn(
        "grid w-full max-w-5xl justify-items-center gap-6",
        className
      )}
      data-size={size}
      data-slot="branch-split"
      {...props}
    >
      <Badge tone={tone}>split</Badge>
      <div
        className={cn(
          "grid w-full gap-5",
          options.length > 2 ? "grid-cols-3" : "grid-cols-2"
        )}
      >
        {options.map((label, index) => (
          <FlowNode
            className="w-full"
            key={`branch-${String(label)}`}
            label={label}
            size="sm"
            style={{ minWidth: 0 }}
            tone={branchTone(index)}
          />
        ))}
      </div>
    </div>
  );
}

export type MergePointProps = BaseComponentProps & {
  label?: React.ReactNode;
};

export function MergePoint({
  className,
  label = "merge",
  tone = "olive",
  ...props
}: MergePointProps) {
  return (
    <div
      className={cn("grid justify-items-center gap-5", className)}
      data-slot="merge-point"
      {...props}
    >
      <div
        className={cn(
          "size-28 rotate-45 rounded-[8px] border-4 bg-az-bone",
          toneBorderClass(tone)
        )}
      />
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

export type LoopArrowProps = BaseComponentProps & {
  label?: React.ReactNode;
};

export function LoopArrow({
  className,
  density = "normal",
  label = "retry",
  size = "lg",
  tone = "mustard",
  ...props
}: LoopArrowProps) {
  const strokeWidth = connectorStrokeWidth(density, {
    compact: 8,
    normal: 11,
    spacious: 14,
  });

  return (
    <div
      className={cn(
        "relative grid place-items-center",
        size === "sm" && "size-56",
        size === "md" && "size-64",
        size === "lg" && "size-72",
        size === "xl" && "size-96",
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-size={size}
      data-slot="loop-arrow"
      {...props}
    >
      <svg
        aria-hidden="true"
        className="absolute inset-0 size-full overflow-visible drop-shadow-[0_18px_22px_rgba(21,20,15,0.14)]"
        fill="none"
        viewBox="0 0 288 288"
      >
        <path
          d="M226 204 A96 96 0 1 1 216 82"
          stroke="currentColor"
          strokeLinecap="round"
          strokeWidth={strokeWidth}
        />
        <path
          d="M243 105 L202 93 L230 71 Z"
          fill="currentColor"
          strokeLinejoin="round"
        />
      </svg>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

export type DependencyLineProps = BaseComponentProps;

export function DependencyLine({
  className,
  density = "normal",
  tone = "ink",
  ...props
}: DependencyLineProps) {
  return (
    <div
      className={cn(
        "w-full max-w-5xl border-current opacity-80",
        density === "compact" && "border-t-4 border-dashed",
        density === "normal" && "border-t-8 border-dashed",
        density === "spacious" && "border-t-12 border-dashed",
        toneTextClass(tone),
        className
      )}
      data-density={density}
      data-slot="dependency-line"
      {...props}
    />
  );
}

export type NodeBadgeProps = BaseComponentProps & {
  children: React.ReactNode;
};

export function NodeBadge({
  children,
  className,
  tone = "coral",
  ...props
}: NodeBadgeProps) {
  return (
    <Badge className={className} tone={tone} {...props}>
      {children}
    </Badge>
  );
}

export type FlowGroupProps = BaseComponentProps & {
  label?: React.ReactNode;
};

export function FlowGroup({
  children,
  className,
  density = "normal",
  label = "group",
  tone = "olive",
  ...props
}: FlowGroupProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid rounded-[12px] border-4 bg-az-paper/45",
        densityClass(density),
        toneBorderClass(tone),
        className
      )}
      data-density={density}
      data-slot="flow-group"
      {...props}
    >
      <Badge tone={tone}>{label}</Badge>
      <div className="mt-8 grid gap-8 sm:grid-cols-2">{children}</div>
    </div>
  );
}

export type SystemBoundaryProps = BaseComponentProps & {
  label?: React.ReactNode;
};

export function SystemBoundary({
  children,
  className,
  density = "normal",
  label = "system",
  tone = "ink",
  ...props
}: SystemBoundaryProps) {
  return (
    <div
      className={cn(
        "grid min-h-88 w-full max-w-5xl place-items-center rounded-[16px] border-10 border-dashed bg-az-paper/28 text-center",
        densityClass(density),
        toneBorderClass(tone),
        className
      )}
      data-density={density}
      data-slot="system-boundary"
      {...props}
    >
      <div className="grid justify-items-center gap-6">
        <Badge tone={tone}>{label}</Badge>
        {children}
      </div>
    </div>
  );
}

function Badge({
  children,
  className,
  tone,
}: {
  children: React.ReactNode;
  className?: string;
  tone: OverlayTone;
}) {
  return (
    <span
      className={cn(
        "inline-flex rounded-full px-6 py-3 font-az-mono font-semibold text-2xl text-az-paper uppercase tracking-[0.16em]",
        toneBgClass(tone),
        className
      )}
    >
      {children}
    </span>
  );
}

function Meta({
  children,
  tone,
}: {
  children: React.ReactNode;
  tone: OverlayTone;
}) {
  return (
    <div
      className={cn(
        "mt-4 font-az-mono text-xl uppercase tracking-[0.16em]",
        toneTextClass(tone)
      )}
    >
      {children}
    </div>
  );
}

function densityClass(density: ComponentDensity) {
  if (density === "compact") {
    return "p-8";
  }
  if (density === "spacious") {
    return "p-14";
  }
  return "p-10";
}

function textSize(size: ComponentSize) {
  if (size === "sm") {
    return "text-4xl";
  }
  if (size === "md") {
    return "text-5xl";
  }
  if (size === "xl") {
    return "text-7xl";
  }
  return "text-6xl";
}

function widthSize(size: ComponentSize) {
  if (size === "sm") {
    return "w-64";
  }
  if (size === "md") {
    return "w-80";
  }
  if (size === "xl") {
    return "w-2xl";
  }
  return "w-136";
}

function connectorArrowRotationClass(
  direction: NonNullable<ConnectorArrowProps["direction"]>
) {
  if (direction === "left") {
    return "rotate-180";
  }

  if (direction === "up") {
    return "-rotate-90";
  }

  if (direction === "down") {
    return "rotate-90";
  }

  return "";
}

function connectorStrokeWidth(
  density: ComponentDensity,
  widths: Record<ComponentDensity, number>
) {
  return widths[density];
}

function branchTone(index: number): OverlayTone {
  if (index === 0) {
    return "coral";
  }

  if (index === 1) {
    return "mustard";
  }

  return "olive";
}

function lineHeight(density: ComponentDensity) {
  if (density === "compact") {
    return "h-2";
  }
  if (density === "spacious") {
    return "h-4";
  }
  return "h-3";
}
