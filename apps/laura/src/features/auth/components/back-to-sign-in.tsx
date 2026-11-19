import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { aofButtonVariants } from "@allonfire/ui/shared/components/aof-button";
import { IconArrowLeft } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Link } from "@/features/i18n/navigation";

/**
 * The way back from a password page to Sign in: an outline icon button set
 * left of the page's action, named by its `aria-label`.
 */
export const BackToSignIn = () => {
  const t = useTranslations("Common.Auth.ForgotPassword");
  return (
    <Link
      aria-label={t("back")}
      className={aofButtonVariants({ size: "icon-field", variant: "outline" })}
      href={AUTH.PAGE.SIGN_IN}
    >
      <IconArrowLeft aria-hidden />
    </Link>
  );
};
