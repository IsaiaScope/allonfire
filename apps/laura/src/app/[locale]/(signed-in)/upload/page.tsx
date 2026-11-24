import { Role } from "@allonfire/database/enums";
import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { SECTION } from "@/shared/constants/laura";
import { pageMetadata } from "@/shared/constants/page-information";

export const generateMetadata = () =>
  pageMetadata(SECTION.UPLOAD.path, `Navigation.${SECTION.UPLOAD.label}`);

// A placeholder until Phase 5 fills it. Upload is above the App's floor: a
// User is sent Home here, by the proxy first (`SECTION.UPLOAD.minRole`) and by
// this check again, and never sees the sidebar's row.
const UploadPage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage>
      <h1 className="sr-only">{t(SECTION.UPLOAD.label)}</h1>
    </AOFSectionPage>
  );
};

export default signedInPage(UploadPage, { minRole: Role.ADMIN });
