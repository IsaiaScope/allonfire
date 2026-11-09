"use client";

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { LogIn } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { Link, useRouter } from "@/features/i18n/navigation";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import { SIGN_IN } from "../constants/sign-in";
import { GateNote } from "./gate-note";

/**
 * What a verification link's landing says: the email is verified (the mark
 * the App put on the link's callback), or Better Auth sent an `error` (the
 * link no longer works: signing in again sends a new one). Either way the way
 * on is Sign in. A page opened by hand has neither, claims nothing and goes to
 * Sign in. Read in the browser, so the page stays in the static shell.
 */
export const EmailVerifiedNote = () => {
  const t = useTranslations("EmailVerified");
  const params = useSearchParams();
  const router = useRouter();
  const failed = params.has(AUTH.MAIL.ERROR_PARAM);
  const landed = failed || params.has(AUTH.MAIL.VERIFIED_PARAM);
  useEffect(() => {
    if (!landed) {
      router.replace(AUTH.PAGE.SIGN_IN);
    }
  }, [landed, router]);
  if (!landed) {
    return null;
  }
  return (
    <div className="flex flex-col gap-6 p-3">
      <GateNote tone={failed ? "warning" : "success"}>
        {failed ? t("failed") : t("verified")}
      </GateNote>
      <Link
        className={cn(
          aofButtonVariants({ size: "field", variant: "default" }),
          kanjiAction(),
          "w-full"
        )}
        href={AUTH.PAGE.SIGN_IN}
      >
        <ActionKanji kanji={SIGN_IN.ENTER_KANJI} />
        <LogIn aria-hidden />
        {t("signIn")}
      </Link>
    </div>
  );
};
