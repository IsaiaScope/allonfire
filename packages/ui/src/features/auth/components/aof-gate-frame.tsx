import type { AppPath } from "@allonfire/auth/shared/constants/auth-schema";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { cn } from "../../../shared/utils/utils";
import {
  AOFControlBar,
  AOFControlBarSeparator,
} from "../../data-table/components/aof-control-bar";
import { AOFLanguageSwitch } from "../../navigation/components/aof-language-switch";
import {
  AOFPage,
  type AOFPageProps,
} from "../../navigation/components/aof-page";
import { AOFThemeToggle } from "../../theme/components/aof-theme-toggle";

export type AOFGateFrameProps = Omit<AOFPageProps, "layout"> & {
  /** The card, below the header. */
  children: ReactNode;
  /** What stands above the card (a board, a title). */
  header?: ReactNode;
  /** The look of a language link: the language the page speaks now, and the others. */
  languageLinkClassName: { current: string; idle: string };
  /** The page the frame stands on, where its language switch stays. */
  page: AppPath;
  /** Painted behind the whole frame. */
  wall?: ReactNode;
};

/**
 * The skeleton every signed-out page stands in: a centred page, the `wall`
 * behind, a column holding the `header` then the card, and at the bottom the
 * control bar with the language switch and the theme toggle. It draws no
 * look of its own beyond the layout: the Design passes the wall, the header
 * and the link classes. Never a link to register: nobody does. A Server
 * Component.
 */
export const AOFGateFrame = ({
  children,
  className,
  header,
  languageLinkClassName,
  page,
  wall,
  ...props
}: AOFGateFrameProps) => {
  const t = useTranslations("Common.Auth.Gate");
  return (
    <AOFPage
      className={cn("gap-0 overflow-hidden pb-24", className)}
      layout="centered"
      {...props}
    >
      {wall}
      <div className="flex w-full max-w-md flex-col gap-6">
        {header}
        {children}
      </div>
      <AOFControlBar className="absolute right-(--gutter-right) bottom-(--gutter-bottom) lg:right-auto lg:left-1/2 lg:-translate-x-1/2">
        <AOFLanguageSwitch
          href={page}
          label={t("language")}
          linkClassName={languageLinkClassName}
        />
        <AOFControlBarSeparator />
        <AOFThemeToggle label={t("theme")} />
      </AOFControlBar>
    </AOFPage>
  );
};
