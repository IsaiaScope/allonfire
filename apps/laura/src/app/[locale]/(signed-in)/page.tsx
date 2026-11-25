import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { useTranslations } from "next-intl";
import { GalleryList } from "@/features/gallery/components/gallery-list";
import { GalleryPage } from "@/features/gallery/components/gallery-page";
import { GALLERY } from "@/features/gallery/constants/gallery";
import { galleryHydration } from "@/features/gallery/utils/gallery-hydration";
import { pageMetadata } from "@/features/metadata/utils/page-information";
import { SECTION } from "@/features/navigation/constants/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

// The layout's default title; only the address differs.
export const generateMetadata = () => pageMetadata(AUTH.PAGE.HOME);

// Home is the Gallery: the page itself is in the static shell, so a visit
// paints at once; only the photos wait behind the feed's skeleton. The
// header's breadcrumb names the page on screen; the page keeps its h1 for
// screen readers.
const HomePage = () => {
  const t = useTranslations("Navigation");
  return (
    <GalleryPage title={t(SECTION.GALLERY.label)}>
      <GalleryList
        hydration={galleryHydration}
        source={GALLERY.SOURCE.GALLERY}
      />
    </GalleryPage>
  );
};

export default signedInPage(HomePage);
