"use client";

import {
  AOFAlertDialog,
  type AOFAlertDialogProps,
} from "@allonfire/ui/components/aof-alert-dialog";
import { aofButtonVariants } from "@allonfire/ui/components/aof-button";
import { cn } from "@allonfire/ui/lib/utils";
import { IconArrowBackUp } from "@tabler/icons-react";
import type { ReactNode } from "react";
import { ActionKanji, BrushKanji, kanjiAction } from "./brush-kanji";

/** The alert's signage, decoration only (the brush face carries each). */
const SIGNAGE = {
  /** Brushed in Cancel: 戻, to go back. */
  CANCEL_KANJI: "戻",
  /** Brushed faint across the body: 注意, a station's caution sign. */
  WALL_KANJI: "注意",
} as const;

export type StationAlertProps = Omit<
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
  /** Brushed in the acting button, the act in one kanji. */
  confirmKanji: string;
  /** The act's pictogram: on the band's red-ringed tile and in its button. */
  icon: ReactNode;
};

/**
 * A question before something that cannot be undone, as a station sign: a
 * night band carries the act's pictogram on a red-ringed tile and the title;
 * below it, following the theme, what happens over 注意 brushed faint, then
 * Cancel and the act as the App's kanji buttons. The band is furniture,
 * night in both themes.
 */
export const StationAlert = ({
  cancel,
  confirm,
  confirmKanji,
  icon,
  ...props
}: StationAlertProps) => {
  const head = (title: ReactNode) => (
    <>
      <div className="dark -mx-4 -mt-4 flex items-center gap-3 border-led border-b bg-led-panel p-3 text-foreground">
        <span
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-sm border border-destructive bg-destructive/10 text-destructive *:size-5"
        >
          {icon}
        </span>
        <div className="min-w-0 flex-1 font-bold leading-snug **:data-[slot=alert-dialog-title]:text-xl">
          {title}
        </div>
      </div>
      {/* Behind the text, cut by the dialog's right edge. */}
      <BrushKanji
        className="top-16 -right-2 -z-10 text-7xl"
        kanji={SIGNAGE.WALL_KANJI}
        placement="header"
      />
    </>
  );
  return (
    <AOFAlertDialog
      cancel={
        <>
          <ActionKanji
            className="text-foreground/10"
            kanji={SIGNAGE.CANCEL_KANJI}
          />
          <IconArrowBackUp aria-hidden />
          {cancel}
        </>
      }
      cancelProps={{
        className: cn(
          aofButtonVariants({ size: "field", variant: "outline" }),
          kanjiAction()
        ),
      }}
      confirm={
        <>
          <ActionKanji kanji={confirmKanji} />
          {icon}
          {confirm}
        </>
      }
      confirmProps={{
        className: cn(
          aofButtonVariants({ size: "field", variant: "destructive" }),
          kanjiAction()
        ),
      }}
      contentProps={{
        className: cn(
          // Sized by the screen: the width between the page's gutters, up to
          // 32rem, never under 18rem; the text keeps room for 注意 behind it
          // and reads at body size, like the buttons under it.
          "isolate min-w-72 overflow-hidden rounded-lg data-[size=default]:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),32rem)] **:data-[slot=alert-dialog-header]:min-h-16 **:data-[slot=alert-dialog-description]:text-base data-[size=default]:sm:max-w-[min(calc(100vw-var(--gutter-left)-var(--gutter-right)),32rem)]"
        ),
      }}
      head={head}
      {...props}
    />
  );
};
