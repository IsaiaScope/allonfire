import type { AppPath } from "@allonfire/auth/features/next/constants/paths";
import {
  AOFControlBar,
  AOFControlBarSeparator,
} from "@allonfire/ui/features/data-table/components/aof-control-bar";
import { AOFPage } from "@allonfire/ui/features/navigation/components/aof-page";
import { AOFThemeToggle } from "@allonfire/ui/features/theme/components/aof-theme-toggle";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { Hanko } from "@/shared/components/hanko";
import { SIGN_IN } from "../constants/sign-in";
import { DepartureBoard } from "./departure-board";
import { LanguageSwitch } from "./language-switch";
import { StationSign } from "./station-sign";

/**
 * A Tokyo station's ticket gate (改札), at night: the departure board above,
 * the card headed like a station sign with the App's logo as the page's
 * heading and its seal, and the gate's name painted large behind it all.
 * Every signed-out page wears it (Sign in, Forgot password, Reset
 * password); `status` is what the board announces, `page` where the language
 * switch stays. A Server Component.
 */
export const TicketGate = ({
  children,
  page,
  status,
}: {
  children: ReactNode;
  page: AppPath;
  status: string;
}) => {
  const t = useTranslations("SignIn");
  return (
    <AOFPage className="gap-0 overflow-hidden pb-24" layout="centered">
      {/* The gate's name, painted huge across the wall behind the card. */}
      <BrushKanji kanji={SIGN_IN.BOARD_KANA} />
      <div className="flex w-full max-w-md flex-col gap-6">
        <DepartureBoard
          className="motion-safe:fade-in motion-safe:slide-in-from-top-2 motion-safe:animate-in motion-safe:duration-500"
          kana={SIGN_IN.BOARD_KANA}
          notice={{
            kana: SIGN_IN.NOTICE_KANA,
            pauseLabel: t("pauseNotice"),
            text: t("notice"),
          }}
          platform={SIGN_IN.PLATFORM}
          status={status}
        />
        <StationSign seal={<Hanko seal={SIGN_IN.SEAL} />}>
          {children}
        </StationSign>
      </div>
      <AOFControlBar className="absolute right-(--gutter-right) bottom-(--gutter-bottom) lg:right-auto lg:left-1/2 lg:-translate-x-1/2">
        <LanguageSwitch href={page} label={t("language")} />
        <AOFControlBarSeparator />
        <AOFThemeToggle label={t("theme")} />
      </AOFControlBar>
    </AOFPage>
  );
};
