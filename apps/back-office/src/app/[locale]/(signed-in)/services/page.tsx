import { useLocale } from "next-intl";
import { redirect } from "@/features/i18n/navigation";
import { SECTION } from "@/features/navigation/constants/sections";
import { sectionEntry } from "@/features/navigation/utils/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

/** Services is its own pages: once the Session passes, it opens the first (Mail). */
const ServicesPage = () =>
  redirect({ href: sectionEntry(SECTION.SERVICES), locale: useLocale() });

export default signedInPage(ServicesPage);
