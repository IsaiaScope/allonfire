"use client";

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { IconLogin } from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect } from "react";
import { aofActionLinkClass } from "../../../shared/components/aof-button";
import type { AOFActionDressing } from "../../../shared/types/action-dressing";
import { AOFGateNote } from "./aof-gate-note";

const { Link, useRouter } = aofBaseNavigation;

/**
 * What a verification link's landing says: the email is verified (the mark
 * the App put on the link's callback), or Better Auth sent an `error` (the
 * link no longer works: signing in again sends a new one). Either way the way
 * on is Sign in. A page opened by hand has neither, claims nothing and goes to
 * Sign in. Read in the browser, so the page stays in the static shell.
 */
export const AOFEmailVerifiedNote = ({
  actions,
}: {
  actions: AOFActionDressing;
}) => {
  const t = useTranslations("Common.Auth.EmailVerified");
  const params = useSearchParams();
  const router = useRouter();
  const failed = params.has(AUTH.MAIL.PARAM.ERROR);
  const landed = failed || params.has(AUTH.MAIL.PARAM.VERIFIED);
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
      <AOFGateNote tone={failed ? "warning" : "success"}>
        {failed ? t("failed") : t("verified")}
      </AOFGateNote>
      <Link
        className={aofActionLinkClass(actions, "w-full")}
        href={AUTH.PAGE.SIGN_IN}
      >
        {actions.marks.enter}
        <IconLogin aria-hidden />
        {t("signIn")}
      </Link>
    </div>
  );
};
