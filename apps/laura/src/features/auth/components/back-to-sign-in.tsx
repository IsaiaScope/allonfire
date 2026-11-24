import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Link } from "@/features/i18n/navigation";
import { ActionArt } from "@/shared/components/action-art";
import { MASCOT } from "@/shared/constants/mascots";

/**
 * The way back from a password page to Sign in: an outline icon button set
 * left of the page's action, named by its `aria-label`, a faint lighthouse
 * behind its arrow.
 */
export const BackToSignIn = () => {
  const t = useTranslations("Common.Auth.ForgotPassword");
  return (
    <Link
      aria-label={t("back")}
      className={cn(
        aofButtonVariants({ size: "icon-field", variant: "outline" }),
        "relative isolate overflow-hidden"
      )}
      href={AUTH.PAGE.SIGN_IN}
    >
      <ActionArt
        art={MASCOT.ACTION.back}
        className="right-auto left-1/2 size-9 -translate-x-1/2"
      />
      <IconArrowLeft aria-hidden />
    </Link>
  );
};
