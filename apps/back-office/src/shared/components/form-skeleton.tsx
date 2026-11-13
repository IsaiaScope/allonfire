import { cn } from "@allonfire/ui/shared/utils/utils";
import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { ink } from "@/shared/utils/skeleton-ink";
import { FormAlert } from "./form-alert";

/**
 * A form page's waiting frame, the one every form skeleton stands in: busy,
 * named for a screen reader by a status line, its parts hidden from it. The
 * parts are drawn at the loaded form's own sizes, so nothing moves when the
 * form arrives.
 */
export const FormSkeleton = ({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  /** What a screen reader hears while it loads. */
  label: string;
}) => (
  <div
    aria-busy
    className={cn("flex flex-1 flex-col gap-6", className)}
    data-skeleton="form"
  >
    <p className="sr-only" role="status">
      {label}
    </p>
    {children}
  </div>
);

/** A form skeleton's bars: a field's own height, a label's line, a title's. */
export const formBar = cva("", {
  variants: {
    part: {
      /** A button, as `size="field"` draws it. */
      button: "h-(--field-height)",
      /** The error line kept under a field (`min-h-6`), empty. */
      error: "h-6",
      /** An input, as its text field draws it. */
      field: "h-(--field-height) w-full",
      /** A small label over a field (`text-sm`). */
      label: "h-5 w-24",
      /** A fieldset's title (`text-base`). */
      legend: "h-6 w-20",
      /** A picture's tile (the Edit page's, 160px square). */
      tile: "",
      /** A page title (`text-2xl`). */
      title: "h-8 w-44",
      /** A choice's capsule (a Gooey toggle). */
      toggle: "h-[46.8px] w-60",
    },
  },
});

/** A bar of `ink`, hidden from a screen reader. */
export const Bar = ({
  className,
  part,
  tone = "faint",
}: {
  className?: string;
  part: NonNullable<VariantProps<typeof formBar>["part"]>;
  tone?: NonNullable<VariantProps<typeof ink>["tone"]>;
}) => (
  <div
    aria-hidden
    className={cn(ink({ tone }), formBar({ part }), className)}
  />
);

/** A form's last row, as `FormActions` lays it out: Cancel and the submit. */
export const FormActionsSkeleton = () => (
  <div
    aria-hidden
    className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"
  >
    <Bar className="sm:w-36" part="button" tone="destructive" />
    <Bar className="sm:w-44" part="button" tone="primary" />
  </div>
);

/** The kept place of a form's answer (`FormAlert`), empty. */
export const FormAlertSkeleton = ({ className }: { className?: string }) => (
  <div aria-hidden>
    <FormAlert className={className} />
  </div>
);
