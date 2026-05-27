import type React from "react";
import { cn } from "../lib/cn";
import { PaperPanel } from "./paper-panel";

export type CodeWindowProps = React.ComponentProps<"div"> & {
  command: string;
  file: string;
  highlightedLine?: number;
  lines: string[];
};

export function CodeWindow({
  className,
  command,
  file,
  highlightedLine = 1,
  lines,
  ...props
}: CodeWindowProps) {
  return (
    <PaperPanel
      className={cn("w-full max-w-[780px] bg-az-ink text-az-paper", className)}
      data-slot="code-window"
      mode="solid"
      {...props}
    >
      <div
        className="flex items-center justify-between gap-4 border-az-paper/18 border-b pb-4 font-az-mono text-az-paper/72 text-lg uppercase tracking-[0.14em]"
        data-slot="code-window-chrome"
      >
        <span data-slot="code-window-file">{file}</span>
        <span className="text-az-coral" data-slot="code-window-command">
          {command}
        </span>
      </div>
      <div
        className="mt-5 grid gap-3 font-az-mono text-3xl leading-relaxed"
        data-slot="code-window-lines"
      >
        {lines.map((line, index) => (
          <div
            className={cn(
              "rounded px-4 py-2",
              index === highlightedLine
                ? "bg-az-coral/34 text-az-paper"
                : "text-az-paper/76"
            )}
            data-highlighted={index === highlightedLine ? "true" : "false"}
            data-slot="code-window-line"
            key={`code-window-line-${line}`}
          >
            <span className="mr-4 text-az-paper/34">
              {String(index + 1).padStart(2, "0")}
            </span>
            {line}
          </div>
        ))}
      </div>
    </PaperPanel>
  );
}
