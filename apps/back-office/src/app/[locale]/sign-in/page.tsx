import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import { SignIn } from "@/features/auth/components/sign-in";

export const generateMetadata = async (): Promise<Metadata> => {
  const t = await getTranslations("SignIn");
  return { title: t("submit") };
};

const SignInPage = () => <SignIn />;

export default SignInPage;
