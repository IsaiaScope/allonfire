import type { AppPath } from "@allonfire/auth/features/next/constants/paths";
import { AOFGateFrame } from "@allonfire/ui/features/auth/components/aof-gate-frame";
import { cva } from "class-variance-authority";
import { useTranslations } from "next-intl";
import type { ReactNode } from "react";
import { BrushKanji } from "@/shared/components/brush-kanji";
import { Hanko } from "@/shared/components/hanko";
import { SIGN_IN } from "../constants/sign-in";
import { DepartureBoard } from "./departure-board";
import { StationSign } from "./station-sign";

const link = cva(
  "rounded-md px-3 py-1 font-led outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
        // The board's amber on black: the language the page speaks now.
        true: "bg-led-panel text-led",
      },
    },
  }
);

/**
 * A Tokyo station's ticket gate (改札), at night: the departure board above,
 * the card headed like a station sign with the App's logo as the page's
 * heading and its seal, and the gate's name painted large behind it all.
 * Every signed-out page wears it (Sign in, Forgot password, Reset
 * password); `status` is what the board announces, `page` where the language
 * switch stays. A Server Component over ui's `AOFGateFrame`.
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
    <AOFGateFrame
      header={
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
      }
      languageLinkClassName={{
        current: link({ current: true }),
        idle: link({ current: false }),
      }}
      page={page}
      wall={
        /* The gate's name, painted huge across the wall behind the card. */
        <BrushKanji kanji={SIGN_IN.BOARD_KANA} />
      }
    >
      <StationSign seal={<Hanko seal={SIGN_IN.SEAL} />} status={status}>
        {children}
      </StationSign>
    </AOFGateFrame>
  );
};
