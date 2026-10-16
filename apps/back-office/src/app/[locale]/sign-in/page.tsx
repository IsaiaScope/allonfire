import { AUTH } from "@allonfire/auth/shared/constants/auth";
import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { SignIn } from "@/features/auth/components/sign-in";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";

export const generateMetadata = async (): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("SignIn"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(AUTH.PAGE.SIGN_IN, locale),
    title: t("submit"),
  };
};

const SignInPage = () => <SignIn />;

export default SignInPage;
