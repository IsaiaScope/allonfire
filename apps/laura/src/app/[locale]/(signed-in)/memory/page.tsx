import { AOFSectionPage } from "@allonfire/ui/features/navigation/components/aof-section-page";
import { useTranslations } from "next-intl";
import { Suspense } from "react";
import { MemoryBoardSkeleton } from "@/features/games/components/memory-board-skeleton";
import { MemoryView } from "@/features/games/components/memory-view";
import { leaderboardHydration } from "@/features/games/utils/leaderboard-hydration";
import { pageMetadata } from "@/features/metadata/utils/page-information";
import { SECTION } from "@/features/navigation/constants/sections";
import { signedInPage } from "@/features/navigation/utils/signed-in-page";

export const generateMetadata = () =>
  pageMetadata(SECTION.MEMORY.path, `Navigation.${SECTION.MEMORY.label}`);

// Memory: the page itself is in the static shell, so a visit paints at once;
// only the board waits behind its skeleton (the deck is drawn by the browser,
// since a draw is random). The header's breadcrumb names the page on screen;
// the page keeps its h1 for screen readers.
const MemoryPage = () => {
  const t = useTranslations("Navigation");
  return (
    <AOFSectionPage width="edge">
      <h1 className="sr-only">{t(SECTION.MEMORY.label)}</h1>
      <Suspense fallback={<MemoryBoardSkeleton />}>
        <MemoryView hydration={leaderboardHydration} />
      </Suspense>
    </AOFSectionPage>
  );
};

export default signedInPage(MemoryPage);
