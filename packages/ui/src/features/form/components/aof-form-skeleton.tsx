import { cva, type VariantProps } from "class-variance-authority";
import type { ReactNode } from "react";
import { ink } from "../../../shared/utils/skeleton-ink";
import { cn } from "../../../shared/utils/utils";
import { AOFFormAlert } from "./aof-form-alert";

/**
 * A form page's waiting frame, the one every form skeleton stands in: busy,
 * named for a screen reader by a status line, its parts hidden from it. The
 * parts are drawn at the loaded form's own sizes, so nothing moves when the
 * form arrives.
 */
export const AOFFormSkeleton = ({
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
export const aofFormBar = cva("", {
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
export const AOFFormBar = ({
  className,
  part,
  tone = "faint",
}: {
  className?: string;
  part: NonNullable<VariantProps<typeof aofFormBar>["part"]>;
  tone?: NonNullable<VariantProps<typeof ink>["tone"]>;
}) => (
  <div
    aria-hidden
    className={cn(ink({ tone }), aofFormBar({ part }), className)}
  />
);

/** A form's last row, as `FormActions` lays it out: Cancel and the submit. */
export const AOFFormActionsSkeleton = () => (
  <div
    aria-hidden
    className="mt-auto flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end"
  >
    <AOFFormBar className="sm:w-36" part="button" tone="destructive" />
    <AOFFormBar className="sm:w-44" part="button" tone="primary" />
  </div>
);

/** The kept place of a form's answer (`AOFFormAlert`), empty. */
export const AOFFormAlertSkeleton = ({ className }: { className?: string }) => (
  <div aria-hidden>
    <AOFFormAlert className={className} />
  </div>
);
