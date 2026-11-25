import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { LeaderboardPageBody } from "@/features/games/components/leaderboard-page-body";
import { LeaderboardSkeleton } from "@/features/games/components/leaderboard-skeleton";
import { leaderboardHydration } from "@/features/games/utils/leaderboard-hydration";
import { pageMetadata } from "@/features/metadata/utils/page-information";
import { SECTION } from "@/features/navigation/constants/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";
import { LAURA } from "@/shared/constants/laura";

const [, LEADERBOARD] = SECTION.MEMORY.pages;

export const generateMetadata = () =>
  pageMetadata(LAURA.PAGE.LEADERBOARD, `Navigation.${LEADERBOARD.label}`);

// The leaderboard: the page itself is in the static shell; only the table
// waits behind its skeleton. The header's breadcrumb names the page on
// screen; the page keeps its h1 for screen readers.
const LeaderboardPage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage width="form">
      <h1 className="sr-only">{t(LEADERBOARD.label)}</h1>
      <div className="flex min-h-0 flex-1 flex-col gap-4">
        <Suspense fallback={<LeaderboardSkeleton />}>
          <LeaderboardPageBody hydration={leaderboardHydration} />
        </Suspense>
      </div>
    </AOFSectionPage>
  );
};

export default signedInPage(LeaderboardPage);
