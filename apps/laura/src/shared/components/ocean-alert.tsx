"use client";

import {
  AOFAlertDialog,
  type AOFAlertDialogProps,
} from "@allonfire/ui/shared/components/aof-alert-dialog";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconArrowBackUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ACTION_DRESSING } from "../constants/action-dressing";
import { MASCOT } from "../constants/mascots";
import { ActionArt } from "./action-art";
import { OceanArt } from "./ocean-art";

/** The title under the mascot, on the ink band. */
const head = (title: ReactNode) => (
  <div className="dark -mx-4 -mt-4 flex items-center gap-3 border-b bg-ink p-3 text-ink-foreground">
    <OceanArt art={MASCOT.APP} className="size-12" />
    <div className="min-w-0 flex-1 font-heading leading-snug **:data-[slot=alert-dialog-title]:font-heading **:data-[slot=alert-dialog-title]:text-ink-foreground **:data-[slot=alert-dialog-title]:text-xl">
      {title}
    </div>
  </div>
);

export type OceanAlertProps = Omit<
  AOFAlertDialogProps,
  | "cancel"
  | "cancelProps"
  | "confirm"
  | "confirmProps"
  | "contentProps"
  | "head"
> & {
  cancel: string;
  confirm: string;
  /** The act's pictogram, in its button. */
  icon: ReactNode;
};

/**
 * A question before something that cannot be undone, in Laura's colours: a
 * band of ink, night in both themes, carries Laura's octopus at its left and
 * the title beside it, like the gate's card; below it, following the theme,
 * what happens, then Cancel and the act as Laura's action buttons, each with
 * its faint picture of the sea (`ACTION_DRESSING`).
 */
export const OceanAlert = ({
  cancel,
  confirm,
  icon,
  ...props
}: OceanAlertProps) => {
  return (
    <AOFAlertDialog
      cancel={
        <>
          <IconArrowBackUp aria-hidden />
          {cancel}
          {ACTION_DRESSING.marks.back}
        </>
      }
      cancelProps={{
        className: cn(
          aofButtonVariants({ size: "field", variant: "outline" }),
          ACTION_DRESSING.className
        ),
      }}
      confirm={
        <>
          {icon}
          {confirm}
          <ActionArt art={MASCOT.REMOVE} />
        </>
      }
      confirmProps={{
        className: cn(
          aofButtonVariants({ size: "field", variant: "destructive" }),
          ACTION_DRESSING.className
        ),
      }}
      contentProps={{
        // The width between the page's gutters, up to 28rem, never under 18rem.
        className:
          "min-w-72 overflow-hidden rounded-xl **:data-[slot=alert-dialog-description]:text-base data-[size=default]:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),28rem)] data-[size=default]:sm:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),28rem)]",
      }}
      head={head}
      {...props}
    />
  );
};
