import { AOFEmpty } from "@allonfire/ui/components/aof-empty";
import { useTranslations } from "next-intl";
import { SectionPage } from "@/features/navigation/components/section-page";
import { SECTION } from "@/features/navigation/constants/sections";
import { sectionMetadata } from "@/features/navigation/utils/section-metadata";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

const { icon: Icon, label } = SECTION.STORAGE;

export const generateMetadata = () => sectionMetadata(SECTION.STORAGE);

const StoragePage = () => {
  const t = useTranslations();
  return (
    <SectionPage className="gap-6">
      <h1 className="font-semibold text-2xl">{t(`Navigation.${label}`)}</h1>
      <AOFEmpty
        description={t("Storage.empty.description")}
        icon={<Icon />}
        title={t("Storage.empty.title")}
      />
    </SectionPage>
  );
};

export default signedInPage(StoragePage);
