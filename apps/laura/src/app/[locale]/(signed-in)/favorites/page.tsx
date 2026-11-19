import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { SECTION } from "@/shared/constants/laura";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(SECTION.FAVORITES.path, `Navigation.${SECTION.FAVORITES.label}`);

// A placeholder until a later phase fills it: nothing is read yet, so the page
// is static and in the shell. The header's breadcrumb names the page on
// screen; the page keeps its h1 for screen readers.
const FavoritesPage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage>
      <h1 className="sr-only">{t(SECTION.FAVORITES.label)}</h1>
    </AOFSectionPage>
  );
};

export default signedInPage(FavoritesPage);
