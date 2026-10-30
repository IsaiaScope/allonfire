import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { BACK_OFFICE } from "@/shared/constants/back-office";

// The layout's default title; only the address differs.
export const generateMetadata = () => pageMetadata(AUTH.PAGE.HOME);

// Sign out lives in the frame's account menu.
const HomePage = () => {
  const t = useTranslations("Home");
  return (
    <SectionPage layout="centered">
      <h1 className="font-semibold text-2xl">{BACK_OFFICE.NAME}</h1>
      <p className="text-muted-foreground">{t("description")}</p>
    </SectionPage>
  );
};

export default signedInPage(HomePage);
