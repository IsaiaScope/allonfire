import { ServiceType } from "@allonfire/database/enums";
import { IconMail } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionLoading } from "@/features/navigation/components/section-loading";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { ServiceProviders } from "@/features/services/components/services-list";
import { BACK_OFFICE } from "@/shared/constants/back-office";

export const generateMetadata = () =>
  pageMetadata(BACK_OFFICE.PAGE.SERVICES_MAIL, "Navigation.mail");

/**
 * The MAIL Service under Services: its title, the Service's switch and its
 * providers, read through the private cache, in the form's width.
 */
const MailService = () => {
  const t = useTranslations();
  return (
    <SectionPage className="gap-6" width="form">
      <ServiceProviders
        title={
          <h1 className="flex items-center gap-2 font-bold text-2xl">
            <IconMail aria-hidden className="size-7" />
            {t("Navigation.mail")}
          </h1>
        }
        type={ServiceType.MAIL}
      />
    </SectionPage>
  );
};

/**
 * The page waits for the providers behind its own boundary, the full
 * frame's waiting room, as a User's page does, never one cut to the form.
 */
const MailPage = () => (
  <Suspense fallback={<SectionLoading />}>
    <MailService />
  </Suspense>
);

export default signedInPage(MailPage);
