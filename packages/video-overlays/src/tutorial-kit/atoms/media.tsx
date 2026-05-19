import type React from "react";
import { Img } from "remotion";
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

type MediaProps = BaseAtomProps & {
  label?: React.ReactNode;
  src?: string;
};

export type SvgIconFrameProps = MediaProps & {
  icon?: React.ReactNode;
};

export function SvgIconFrame({
  className,
  icon,
  label = "SVG",
  tone = "coral",
  ...props
}: SvgIconFrameProps) {
  return (
    <MediaFrame
      className={className}
      label={label}
      tone={tone}
      {...props}
      data-slot="svg-icon-frame"
    >
      {icon ?? <SampleIcon />}
    </MediaFrame>
  );
}

export type LogoNodeProps = MediaProps;

export function LogoNode({
  className,
  label = "Logo",
  src,
  tone = "ink",
  ...props
}: LogoNodeProps) {
  return (
    <div
      className={cn(
        "relative grid size-80 place-items-center rounded-full border-4 bg-az-paper-dark/52 shadow-[0_22px_42px_-34px_rgba(21,20,15,0.58)]",
        toneBorderClass(tone),
        className
      )}
      data-slot="logo-node"
      {...props}
    >
      <MediaImage className="size-40" src={src} />
      {label ? (
        <div
          className={cn(
            "absolute bottom-8 rounded-full border-2 border-az-ink/12 bg-az-bone px-6 py-3 font-az-mono font-extrabold text-2xl uppercase tracking-[0.14em]",
            toneTextClass(tone)
          )}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type ImageCardProps = MediaProps;

export function ImageCard(props: ImageCardProps) {
  return <MediaFrame {...props} data-slot="image-card" />;
}

export type ImageCutoutProps = MediaProps;

export function ImageCutout({
  className,
  label,
  src,
  tone = "coral",
  ...props
}: ImageCutoutProps) {
  return (
    <div
      className={cn(
        "az-video-shadow relative grid h-72 w-152 place-items-center overflow-hidden rounded-full border-8 border-az-ink/14 bg-az-paper-dark/52",
        className
      )}
      data-slot="image-cutout"
      {...props}
    >
      <div className="absolute inset-x-0 top-0 bottom-20 grid place-items-center">
        <MediaImage className="size-full" src={src} />
      </div>
      {label ? (
        <div
          className={cn(
            "absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full border-2 border-az-ink/12 bg-az-bone px-6 py-3 font-az-mono font-extrabold text-2xl uppercase tracking-[0.14em]",
            toneTextClass(tone)
          )}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

export type ScreenshotFrameProps = MediaProps;

export function ScreenshotFrame({ className, ...props }: ScreenshotFrameProps) {
  return (
    <MediaFrame
      chrome="screenshot"
      className={className}
      {...props}
      data-slot="screenshot-frame"
    />
  );
}

export type BrowserFrameProps = MediaProps;

export function BrowserFrame({ className, ...props }: BrowserFrameProps) {
  return (
    <MediaFrame
      chrome="browser"
      className={className}
      {...props}
      data-slot="browser-frame"
    />
  );
}

export type TerminalFrameProps = MediaProps & {
  command?: React.ReactNode;
};

export function TerminalFrame({
  className,
  command = "pnpm render",
  label = "terminal",
  tone = "ink",
  ...props
}: TerminalFrameProps) {
  return (
    <div
      className={cn(
        "az-video-shadow grid w-full max-w-4xl gap-6 rounded-[8px] border-2 border-az-paper/16 bg-az-ink p-10 text-az-paper",
        className
      )}
      data-slot="terminal-frame"
      {...props}
    >
      <div className="font-az-mono text-2xl text-az-paper/58 uppercase tracking-[0.16em]">
        {label}
      </div>
      <div
        className={cn("font-az-mono font-bold text-5xl", toneTextClass(tone))}
      >
        {command}
      </div>
    </div>
  );
}

export type DeviceFrameProps = MediaProps & {
  device?: "phone" | "tablet" | "laptop";
};

export function DeviceFrame({
  className,
  device = "phone",
  label,
  src,
  tone = "coral",
  ...props
}: DeviceFrameProps) {
  const tablet = device === "tablet" || device === "laptop";

  return (
    <div
      className={cn(
        "az-video-shadow relative grid place-items-center border-az-ink bg-az-ink shadow-[0_34px_70px_-44px_rgba(21,20,15,0.72)]",
        tablet
          ? "h-120 w-184 rounded-[2.4rem] border-14 p-4"
          : "h-168 w-84 rounded-[3rem] border-12 p-3",
        className
      )}
      data-device={tablet ? "tablet" : "phone"}
      data-slot="device-frame"
      {...props}
    >
      <div
        className={cn(
          "relative grid size-full place-items-center overflow-hidden bg-az-paper-dark/52",
          tablet ? "rounded-[1.35rem]" : "rounded-[2.15rem]"
        )}
      >
        <div
          className={cn(
            "absolute inset-x-8 top-10 bottom-24 grid place-items-center",
            tablet && "inset-x-12 top-12 bottom-28"
          )}
        >
          <MediaImage className="size-full" src={src} />
        </div>
        {label ? (
          <div
            className={cn(
              "absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full border-2 border-az-ink/12 bg-az-bone px-6 py-3 font-az-mono font-extrabold text-2xl uppercase tracking-[0.14em]",
              toneTextClass(tone)
            )}
          >
            {label}
          </div>
        ) : null}
      </div>
      {tablet ? (
        <div className="absolute top-4 left-1/2 size-3 -translate-x-1/2 rounded-full bg-az-paper/32" />
      ) : (
        <>
          <div className="absolute top-4 left-1/2 h-2 w-20 -translate-x-1/2 rounded-full bg-az-paper/28" />
          <div className="absolute top-4 right-16 size-2 rounded-full bg-az-paper/24" />
          <div className="absolute bottom-4 left-1/2 h-1.5 w-24 -translate-x-1/2 rounded-full bg-az-paper/22" />
        </>
      )}
    </div>
  );
}

export type VintagePhotoFrameProps = MediaProps;

export function VintagePhotoFrame({
  className,
  label = "memory",
  src,
  ...props
}: VintagePhotoFrameProps) {
  return (
    <div
      className={cn(
        "az-video-shadow w-152 -rotate-2 bg-az-bone p-7 pb-14 shadow-[0_30px_62px_-42px_rgba(21,20,15,0.62)]",
        className
      )}
      data-slot="vintage-photo-frame"
      {...props}
    >
      <div className="border-2 border-az-ink/14 bg-az-paper p-3 shadow-[inset_0_0_0_1px_rgba(21,20,15,0.08)]">
        <div className="h-72 overflow-hidden rounded-[2px] bg-az-paper-dark/52">
          <MediaImage className="size-full sepia-[0.22]" src={src} />
        </div>
      </div>
      <div className="mt-6 min-h-12 font-az-serif text-4xl text-az-ink-soft italic">
        {label}
      </div>
    </div>
  );
}

export type PolaroidFrameProps = MediaProps;

export function PolaroidFrame({
  className,
  label = "snapshot",
  src,
  ...props
}: PolaroidFrameProps) {
  return (
    <div
      className={cn(
        "az-video-shadow w-136 rotate-2 bg-az-bone p-7 pb-20 shadow-[0_32px_68px_-44px_rgba(21,20,15,0.62)]",
        className
      )}
      data-slot="polaroid-frame"
      {...props}
    >
      <div className="border-2 border-az-ink/16 bg-az-paper p-4 shadow-[inset_0_0_0_1px_rgba(21,20,15,0.08)]">
        <div className="aspect-square w-full overflow-hidden rounded-[2px] bg-az-paper-dark/52">
          <MediaImage className="size-full sepia-[0.12]" src={src} />
        </div>
      </div>
      <div className="mt-7 min-h-14 text-center font-az-serif text-4xl text-az-ink-soft italic">
        {label}
      </div>
    </div>
  );
}

export type StampImageProps = MediaProps & {
  stamp?: React.ReactNode;
};

export function StampImage({
  className,
  stamp = "OK",
  tone = "olive",
  ...props
}: StampImageProps) {
  return (
    <div className={cn("relative", className)} data-slot="stamp-image">
      <ImageCard {...props} />
      <div
        className={cn(
          "az-video-shadow absolute -top-8 -right-8 -rotate-6 rounded-[8px] border-[6px] bg-az-bone px-8 py-5 font-az-sans font-extrabold text-6xl uppercase leading-none",
          toneBorderClass(tone),
          toneTextClass(tone)
        )}
      >
        {stamp}
      </div>
    </div>
  );
}

export type PinnedImageProps = MediaProps;

export function PinnedImage({
  className,
  tone = "coral",
  ...props
}: PinnedImageProps) {
  return (
    <div className={cn("relative", className)} data-slot="pinned-image">
      <ImageCard {...props} />
      <div
        className={cn(
          "az-video-shadow absolute -top-8 left-1/2 size-14 -translate-x-1/2 rounded-full border-4 border-az-bone",
          toneBgClass(tone)
        )}
      />
    </div>
  );
}

export type ImageComparisonProps = MediaProps & {
  afterLabel?: React.ReactNode;
  beforeLabel?: React.ReactNode;
};

export function ImageComparison({
  afterLabel = "after",
  beforeLabel = "before",
  className,
  ...props
}: ImageComparisonProps) {
  return (
    <div
      className={cn("grid w-full max-w-5xl grid-cols-2 gap-8", className)}
      data-slot="image-comparison"
    >
      <ImageCard label={beforeLabel} tone="ink" {...props} />
      <ImageCard label={afterLabel} tone="olive" {...props} />
    </div>
  );
}

export type ImageCalloutProps = MediaProps & {
  callout?: React.ReactNode;
};

export function ImageCallout({
  callout = "focus",
  className,
  tone = "coral",
  ...props
}: ImageCalloutProps) {
  return (
    <div className={cn("relative", className)} data-slot="image-callout">
      <ImageCard tone={tone} {...props} />
      <div
        className={cn(
          "absolute top-10 right-10 h-28 w-48 rounded-[8px] border-8 bg-transparent",
          toneBorderClass(tone)
        )}
      />
      <div
        className={cn(
          "az-video-shadow absolute top-0 right-4 rounded-full border-2 border-az-ink/14 bg-az-bone px-6 py-3 font-az-sans font-extrabold text-3xl",
          toneTextClass(tone)
        )}
      >
        {callout}
      </div>
    </div>
  );
}

export type MaskedImageShapeProps = MediaProps & {
  shape?: "circle" | "rounded";
};

export function MaskedImageShape({
  className,
  shape = "circle",
  ...props
}: MaskedImageShapeProps) {
  return (
    <MediaFrame
      className={cn(
        shape === "circle" ? "rounded-full" : "rounded-[24px]",
        className
      )}
      {...props}
      data-slot="masked-image-shape"
    />
  );
}

function MediaFrame({
  children,
  chrome,
  className,
  label,
  src,
  tone = "coral",
  ...props
}: MediaProps & {
  children?: React.ReactNode;
  chrome?: "browser" | "screenshot";
}) {
  return (
    <div
      className={cn(
        "az-video-shadow grid w-full max-w-2xl overflow-hidden rounded-[8px] border-2 border-az-ink/18 bg-az-bone",
        className
      )}
      {...props}
    >
      {chrome ? <Chrome chrome={chrome} /> : null}
      <div className="grid min-h-80 place-items-center overflow-hidden bg-az-paper-dark/52">
        {children ?? <MediaImage src={src} />}
      </div>
      {label ? (
        <div
          className={cn(
            "px-8 py-5 font-az-mono font-semibold text-2xl uppercase tracking-[0.16em]",
            toneTextClass(tone)
          )}
        >
          {label}
        </div>
      ) : null}
    </div>
  );
}

function MediaImage({
  className,
  src,
  ...props
}: React.ComponentProps<"div"> & { src?: string }) {
  if (src) {
    return (
      <Img className={cn("size-full object-cover", className)} src={src} />
    );
  }

  return (
    <div
      className={cn("grid size-full place-items-center", className)}
      {...props}
    >
      <SampleIcon />
    </div>
  );
}

function Chrome({ chrome }: { chrome: "browser" | "screenshot" }) {
  return (
    <div className="flex items-center gap-3 border-az-ink/14 border-b-2 bg-az-bone px-5 py-4">
      <span className="size-4 rounded-full bg-az-coral" />
      <span className="size-4 rounded-full bg-az-mustard" />
      <span className="size-4 rounded-full bg-az-olive" />
      <span className="ml-5 font-az-mono text-az-ink-faint text-xl uppercase tracking-[0.14em]">
        {chrome}
      </span>
    </div>
  );
}

function SampleIcon() {
  return (
    <svg
      aria-label="Image placeholder"
      className="size-40 text-az-ink"
      fill="none"
      role="img"
      viewBox="0 0 160 160"
    >
      <rect
        height="96"
        rx="14"
        stroke="currentColor"
        strokeWidth="12"
        width="112"
        x="24"
        y="32"
      />
      <path
        d="M42 104 L70 78 L92 98 L108 84 L126 104"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="10"
      />
      <circle cx="110" cy="58" fill="currentColor" r="10" />
    </svg>
  );
}
