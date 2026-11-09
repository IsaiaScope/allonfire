"use client";

import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/features/i18n/navigation";
import {
  ToolbarActionBody,
  toolbarActionClass,
} from "@/shared/components/toolbar-action";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";

/**
 * The way back from a password page to Sign in: the App's icon button with
 * its kanji brushed at the edge (as Delete and Add in the Users toolbar),
 * 戻 (return) behind a left arrow, set left of the page's action. Its words
 * live in the tip above it and in its accessible name.
 */
export const BackToSignIn = ({ className }: { className?: string }) => {
  const t = useTranslations("ForgotPassword");
  return (
    <AOFTooltip contentProps={{ side: "top" }} label={t("back")}>
      <Link
        aria-label={t("back")}
        className={cn(toolbarActionClass("icon", "outline"), className)}
        href={AUTH.PAGE.SIGN_IN}
      >
        <ToolbarActionBody
          icon={<ArrowLeft aria-hidden />}
          kanjiProps={{ kanji: ACTION_KANJI.BACK }}
          label={t("back")}
          shape="icon"
        />
      </Link>
    </AOFTooltip>
  );
};
