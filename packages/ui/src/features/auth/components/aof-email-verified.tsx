import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import type { AOFAuthDressing } from "../types/auth-dressing";
import { AOFEmailVerifiedNote } from "./aof-email-verified-note";

/** Where a verification link lands, inside the App's frame. A Server Component. */
export const AOFEmailVerified = ({
  dressing,
}: {
  dressing: AOFAuthDressing;
}) => {
  const t = useTranslations("Common.Auth.EmailVerified");
  const { Gate } = dressing;
  return (
    <Gate page={AUTH.PAGE.EMAIL_VERIFIED} status={t("title")}>
      {/* The link's outcome is read in the browser, so the page stays static. */}
      <Suspense fallback={null}>
        <AOFEmailVerifiedNote actions={dressing.actions} />
      </Suspense>
    </Gate>
  );
};
