import { AOFEmpty } from "@allonfire/ui/components/aof-empty";
import { IconUser } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { SectionPage } from "@/features/navigation/components/section-page";
import { SECTION } from "@/features/navigation/constants/sections";
import { sectionMetadata } from "@/features/navigation/utils/section-metadata";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

export const generateMetadata = () => sectionMetadata(SECTION.USERS);

/** One User's page; its content arrives in a later plan. */
const UserPage = () => {
  const t = useTranslations("Users.detail");
  return (
    <SectionPage>
      <AOFEmpty
        description={t("description")}
        icon={<IconUser />}
        title={t("title")}
      />
    </SectionPage>
  );
};

export default signedInPage(UserPage);
