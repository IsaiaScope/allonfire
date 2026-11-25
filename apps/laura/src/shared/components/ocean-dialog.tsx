"use client";

import {
  AOFDialog,
  AOFDialogContent,
  AOFDialogFooter,
  AOFDialogTitle,
} from "@allonfire/ui/shared/components/aof-dialog";
import type { ComponentProps, ReactNode } from "react";
import { oceanDialogBox } from "./ocean-dialog-box";
import { OceanHead } from "./ocean-head";

export type OceanDialogProps = Omit<
  ComponentProps<typeof AOFDialog>,
  "children"
> & {
  children: ReactNode;
  /** The dialog's actions: Laura's action buttons, each with its picture of the sea. A Close among them is the dialog's own. */
  actions: ReactNode;
  /** What sits at the band's far end, where a close button would (a compact action); none leaves it bare. */
  end?: ReactNode;
  title: ReactNode;
};

/**
 * A dialog of Laura, dressed as the delete-photo alert (`OceanAlert`): a band
 * of ink carries Laura's octopus and the title, the body follows the theme
 * and reads from the left, and the actions fill the footer: a column on a
 * phone, one line from `sm`, as the alert's. There is no corner close button
 * (Escape and the footer's Close dismiss it): the band's far end is `end`'s.
 * The width stays between the page's gutters, up to 28rem, never under 18rem.
 */
export const OceanDialog = ({
  actions,
  children,
  end,
  title,
  ...props
}: OceanDialogProps) => (
  <AOFDialog {...props}>
    <AOFDialogContent className={oceanDialogBox()} showCloseButton={false}>
      <OceanHead end={end}>
        <AOFDialogTitle>{title}</AOFDialogTitle>
      </OceanHead>
      {children}
      <AOFDialogFooter>{actions}</AOFDialogFooter>
    </AOFDialogContent>
  </AOFDialog>
);
