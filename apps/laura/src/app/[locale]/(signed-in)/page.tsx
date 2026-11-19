import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { SECTION } from "@/shared/constants/laura";
import { pageMetadata } from "@/shared/constants/page-information";

// The layout's default title; only the address differs.
export const generateMetadata = () => pageMetadata(AUTH.PAGE.HOME);

// Home is the Gallery. A placeholder until Phase 4 fills it: nothing is read
// yet, so the page is static and in the shell. The header's breadcrumb names
// the page on screen; the page keeps its h1 for screen readers.
const HomePage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage>
      <h1 className="sr-only">{t(SECTION.GALLERY.label)}</h1>
    </AOFSectionPage>
  );
};

export default signedInPage(HomePage);
