import { hasSectionRole } from "@allonfire/auth/features/next/utils/has-section-role";
import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import { AOFHydratedBoundary } from "@allonfire/core/features/next/query/components/aof-hydrated-boundary";
import { Role } from "@allonfire/database/enums";
import { AOFFreshOnReturn } from "@allonfire/ui/features/query/components/aof-fresh-on-return";
import type { DehydratedState } from "@tanstack/react-query";
import { MemoryBoard } from "./memory-board";

/**
 * Memory's board with the leaderboard already in the browser's cache (for the
 * best-score badge): the page's own read (`hydration`, kept in the visitor's
 * browser), handed through the plain boundary (the leaderboard is one body, so
 * a newer copy simply replaces the older), and whether the Session's User is
 * an Admin, who is pointed to Upload when photos are missing. That is drawn
 * only: the API judges every write itself. The board starts over each time
 * its page comes back (`AOFFreshOnReturn`): a game belongs to one visit.
 */
export const MemoryView = async ({
  hydration,
}: {
  hydration: () => Promise<DehydratedState>;
}) => {
  const canUpload = hasSectionRole(await requireAppSession(), Role.ADMIN);
  return (
    <AOFHydratedBoundary hydration={hydration}>
      <AOFFreshOnReturn>
        <MemoryBoard canUpload={canUpload} />
      </AOFFreshOnReturn>
    </AOFHydratedBoundary>
  );
};
