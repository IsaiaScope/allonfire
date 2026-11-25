"use client";

import {
  AOFAlertDialog,
  type AOFAlertDialogProps,
} from "@allonfire/ui/shared/components/aof-alert-dialog";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconArrowBackUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { MASCOT } from "../constants/mascots";
import { ActionArt } from "./action-art";
import { ACTION_DRESSING } from "./action-dressing";
import { oceanDialogBox } from "./ocean-dialog-box";
import { OceanHead } from "./ocean-head";

/** The title under the mascot, on the ink band. */
const head = (title: ReactNode) => <OceanHead>{title}</OceanHead>;

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
}: OceanAlertProps) => (
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
      className: cn(
        oceanDialogBox(),
        "**:data-[slot=alert-dialog-description]:text-base"
      ),
    }}
    head={head}
    {...props}
  />
);
