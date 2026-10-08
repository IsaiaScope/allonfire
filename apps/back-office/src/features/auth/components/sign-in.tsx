import { APP_PATH } from "@allonfire/auth/features/next/constants/access";
import { languageSchema } from "@allonfire/core/features/i18n/constants/locales";
import {
  AOFControlBar,
  AOFControlBarSeparator,
} from "@allonfire/ui/components/aof-control-bar";
import { AOFStorageImage } from "@allonfire/ui/components/aof-image";
import { AOFPage } from "@allonfire/ui/components/aof-page";
import { AOFThemeToggle } from "@allonfire/ui/components/aof-theme-toggle";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import { useLocale, useTranslations } from "next-intl";
import { BOARD_KANA, NOTICE_KANA, PLATFORM, SEAL } from "../constants/sign-in";
import { SIGN_IN_IMAGE } from "../constants/sign-in-image";
import { DepartureBoard } from "./departure-board";
import { Hanko } from "./hanko";
import { LanguageSwitch } from "./language-switch";
import { Shinkansen } from "./shinkansen";
import { SignInForm } from "./sign-in-form";
import { TactileStrip } from "./tactile-strip";

// Entrances play once, short, and never for reduced motion.
const enter = cva(
  "motion-safe:fade-in motion-safe:animate-in motion-safe:duration-500",
  {
    variants: {
      from: {
        bottom: "motion-safe:slide-in-from-bottom-3",
        top: "motion-safe:slide-in-from-top-2",
      },
    },
  }
);

/**
 * Signing in at a Tokyo station at night: the departure board hangs over the
 * photograph, the card stands centred in its own column past the tactile
 * paving (on a phone, over the photograph), headed like a station sign with
 * the App's line pictogram and its seal. Station furniture (board, sign band,
 * pictogram tiles) stays night through a scoped `.dark`; the rest follows the
 * theme. A Server Component: the form and the theme toggle are its only
 * client parts.
 */
export const SignIn = () => {
  const t = useTranslations("SignIn");
  const language = languageSchema.parse(useLocale());
  return (
    <AOFPage layout="split">
      <div className="absolute inset-0 -z-10 *:size-full *:object-cover lg:right-132">
        {/* Photo: mos design on Unsplash (Unsplash License); provenance on
            SIGN_IN_IMAGE. Cropped on the train for portrait screens. It is
            the page's largest paint, so it loads first and never lazily. */}
        <AOFStorageImage
          className="object-[62%_50%]"
          image={SIGN_IN_IMAGE}
          language={language}
          lcp
          sizes="(min-width: 64rem) calc(100vw - 33rem), 100vw"
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-background/20 lg:hidden dark:bg-background/40"
        />
      </div>
      <section className="min-w-0 p-3 sm:p-4 lg:flex-1 lg:p-10">
        <div className={cn("mx-auto max-w-xl", enter({ from: "top" }))}>
          <DepartureBoard
            kana={BOARD_KANA}
            notice={t("notice")}
            noticeKana={NOTICE_KANA}
            pauseLabel={t("pauseNotice")}
            platform={PLATFORM}
            status={t("submit")}
          />
        </div>
      </section>
      <TactileStrip className="hidden lg:block" orientation="vertical" />
      <section className="relative flex flex-1 items-center justify-center px-3 pt-8 pb-20 sm:px-4 lg:w-lg lg:flex-none lg:px-10 lg:pb-8">
        <div
          className={cn(
            "flex w-full max-w-md flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg",
            enter({ from: "bottom" })
          )}
        >
          <div className="dark flex items-center gap-3 border-led border-b bg-led-panel px-3 py-3 text-foreground sm:px-4 lg:px-6 dark:border-led-dim">
            <span
              aria-hidden
              className="flex size-10 shrink-0 items-center justify-center rounded-md bg-line text-led-panel"
            >
              <Shinkansen className="size-8" />
            </span>
            <h1 className="font-bold text-xl leading-tight">{t("app")}</h1>
            <span className="ml-auto">
              <Hanko seal={SEAL} />
            </span>
          </div>
          <SignInForm />
        </div>
        <AOFControlBar className="absolute right-3 bottom-4 sm:right-4 lg:right-auto lg:bottom-6 lg:left-10">
          <LanguageSwitch href={APP_PATH.SIGN_IN} label={t("language")} />
          <AOFControlBarSeparator />
          <AOFThemeToggle label={t("theme")} />
        </AOFControlBar>
      </section>
    </AOFPage>
  );
};
