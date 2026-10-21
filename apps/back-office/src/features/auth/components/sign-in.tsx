import { AUTH } from "@allonfire/auth/shared/constants/auth";
import {
  AOFControlBar,
  AOFControlBarSeparator,
} from "@allonfire/ui/components/aof-control-bar";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { AOFThemeToggle } from "@allonfire/ui/components/aof-theme-toggle";
import { useTranslations } from "next-intl";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { Hanko } from "@/shared/components/hanko";
import { SIGN_IN } from "../constants/sign-in";
import { DepartureBoard } from "./departure-board";
import { LanguageSwitch } from "./language-switch";
import { SignInForm } from "./sign-in-form";
import { StationSign } from "./station-sign";

/**
 * Signing in at a Tokyo station's ticket gate (改札), at night: the
 * departure board above, the card headed like a station sign with the App's
 * logo as the page's heading and its seal, the submit as the gate's card
 * reader, and the gate's name painted large behind it all. A Server Component:
 * the form and the theme toggle are its only client parts.
 */
export const SignIn = () => {
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
          status={t("submit")}
        />
        <StationSign seal={<Hanko seal={SIGN_IN.SEAL} />}>
          <SignInForm />
        </StationSign>
      </div>
      <AOFControlBar className="absolute right-(--gutter-right) bottom-(--gutter-bottom) lg:right-auto lg:left-1/2 lg:-translate-x-1/2">
        <LanguageSwitch href={AUTH.PAGE.SIGN_IN} label={t("language")} />
        <AOFControlBarSeparator />
        <AOFThemeToggle label={t("theme")} />
      </AOFControlBar>
    </AOFPage>
  );
};
