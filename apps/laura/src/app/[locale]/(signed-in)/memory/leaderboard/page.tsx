import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { LAURA, SECTION } from "@/shared/constants/laura";
import { pageMetadata } from "@/shared/constants/page-information";

const [, LEADERBOARD] = SECTION.MEMORY.pages;

export const generateMetadata = () =>
  pageMetadata(LAURA.PAGE.LEADERBOARD, `Navigation.${LEADERBOARD.label}`);

// A placeholder until Phase 6 fills it: nothing is read yet, so the page is
// static and in the shell. The header's breadcrumb names the page on screen;
// the page keeps its h1 for screen readers.
const LeaderboardPage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage>
      <h1 className="sr-only">{t(LEADERBOARD.label)}</h1>
    </AOFSectionPage>
  );
};

export default signedInPage(LeaderboardPage);
