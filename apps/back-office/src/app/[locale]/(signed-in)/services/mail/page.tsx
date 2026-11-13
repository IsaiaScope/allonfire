import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { ServiceType } from "@allonfire/database/enums";
import { IconMail } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { pageMetadata } from "@/features/metadata/utils/page-metadata";
import { SectionPage } from "@/features/navigation/components/section-page";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { ServiceProviders } from "@/features/services/components/service-providers";
import { ServicesSkeleton } from "@/features/services/components/services-skeleton";
import { servicesHydration } from "@/features/services/utils/services-hydration";
import { BACK_OFFICE } from "@/shared/constants/back-office";

export const generateMetadata = () =>
  pageMetadata(BACK_OFFICE.PAGE.SERVICES_MAIL, "Navigation.mail");

/** The page's heading: shown at once, and handed to the view that
 *  waits on the providers. */
const MailTitle = () => {
  const t = useTranslations("Navigation");
  return (
    <h1 className="flex items-center gap-2 font-bold text-2xl">
      <IconMail aria-hidden className="size-7" />
      {t("mail")}
    </h1>
  );
};

const hydrateMail = () => servicesHydration(ServiceType.MAIL);

/**
 * The MAIL Service under Services: its title, the Service's switch and its
 * providers, read through the private cache, in the form's width. While the
 * API answers, the page keeps its title and draws the card's shapes
 * (`ServicesSkeleton`), as the Users list does.
 */
const MailPage = () => {
  const title = <MailTitle />;
  return (
    <SectionPage className="gap-6" width="form">
      <Suspense fallback={<ServicesSkeleton title={title} />}>
        <AOFHydratedBoundary hydration={hydrateMail}>
          <ServiceProviders title={title} type={ServiceType.MAIL} />
        </AOFHydratedBoundary>
      </Suspense>
    </SectionPage>
  );
};

export default signedInPage(MailPage);
