import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { Pause, Play } from "lucide-react";

export type DepartureBoardProps = ComponentPropsWithoutChildren<"div"> & {
  /** The status in kana, beside the platform. */
  kana: string;
  /** The standing notice, read once and run right to left. */
  notice: string;
  /** The notice in Japanese, run before it. */
  noticeKana: string;
  /** The accessible name of the pause control. */
  pauseLabel: string;
  platform: string;
  /** The status in the visitor's language, announced politely. */
  status: string;
};

/**
 * An amber LED departure board: platform, status in kana and in the visitor's
 * language (announced politely as it changes), and a notice running right to
 * left on the bottom row. The running copy is hidden from assistive tech,
 * which reads the notice once. A native checkbox pauses it (WCAG 2.2.2) with
 * no script; it also pauses under the pointer and stands still when the
 * visitor asks for reduced motion.
 */
export const DepartureBoard = ({
  className,
  kana,
  notice,
  noticeKana,
  pauseLabel,
  platform,
  status,
  ...props
}: DepartureBoardProps) => (
  <div
    className={cn(
      "group/notice pattern-led-grid overflow-hidden rounded-md border-2 border-led-dim bg-led-panel font-led text-led leading-tight",
      className
    )}
    {...props}
  >
    <div className="flex items-baseline gap-3 border-led-dim border-b py-2 pr-1.5 pl-3 text-lg">
      <span aria-hidden className="text-led/80" lang="ja">
        {platform}番線
      </span>
      <span aria-hidden lang="ja">
        {kana}
      </span>
      <span aria-live="polite" className="ml-auto truncate">
        {status}
      </span>
      <label className="flex size-7 shrink-0 cursor-pointer items-center justify-center self-center rounded-md border border-led-dim text-led/80 hover:border-led hover:text-led has-focus-visible:outline-2 has-focus-visible:outline-ring motion-reduce:hidden">
        <input className="peer sr-only" type="checkbox" />
        <Pause aria-hidden className="size-4 peer-checked:hidden" />
        <Play aria-hidden className="hidden size-4 peer-checked:block" />
        <span className="sr-only">{pauseLabel}</span>
      </label>
    </div>
    <p className="overflow-hidden py-1.5 text-sm">
      <span className="sr-only">{notice}</span>
      <span
        aria-hidden
        className="hover:paused group-has-checked/notice:paused flex w-max animate-marquee whitespace-nowrap motion-reduce:animate-none"
      >
        {[0, 1].map((copy) => (
          <span className="flex gap-3 pr-16 pl-3" key={copy}>
            <span lang="ja">{noticeKana}</span>
            <span>{notice}</span>
          </span>
        ))}
      </span>
    </p>
  </div>
);
