import type { InstallStep } from "@allonfire/core/features/next/pwa/constants/pwa";
import type { ComponentType } from "react";
import { cn } from "../../../shared/utils/utils";

/**
 * The browser's steps under an Install hint, where it offers no Install
 * button: one numbered row per step, its words, and the control it points at
 * drawn as the browser draws it, in the ✕'s column. The rows' shape is shared;
 * the App's Design dresses the number, the words and the icon, and brings
 * its own `icons`.
 */
export const AOFInstallSteps = ({
  classNames,
  icons,
  steps,
}: {
  classNames: {
    /** The icon's own look (its colour). */
    icon?: string;
    /** The number's badge: its corner, border and type. */
    number: string;
    /** The words' colour. */
    text?: string;
  };
  icons: Record<InstallStep, ComponentType<{ className?: string }>>;
  steps: { step: InstallStep; text: string }[];
}) => (
  <ol className="flex flex-col gap-2">
    {steps.map(({ step, text }, index) => {
      const StepIcon = icons[step];
      return (
        <li className="flex items-center gap-2.5 text-sm" key={step}>
          <span
            aria-hidden
            className={cn(
              "grid size-6 shrink-0 place-items-center text-xs",
              classNames.number
            )}
          >
            {index + 1}
          </span>
          <span className={cn("flex-1", classNames.text)}>{text}</span>
          {/* The ✕'s box, so the icons stand in its column. */}
          <span aria-hidden className="grid size-7 shrink-0 place-items-center">
            <StepIcon className={cn("size-4", classNames.icon)} />
          </span>
        </li>
      );
    })}
  </ol>
);
