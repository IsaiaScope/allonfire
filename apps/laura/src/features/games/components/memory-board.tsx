"use client";

import type { DeckImage } from "@allonfire/api/features/laura/games/constants/schemas";
import { formatTime } from "@allonfire/core/shared/utils/format-time";
import { useAOFAltLanguage } from "@allonfire/ui/features/image/hooks/use-aof-alt-language";
import { aofAltFor } from "@allonfire/ui/features/image/utils/alt-for";
import { AOFQueryView } from "@allonfire/ui/features/query/components/aof-query-view";
import { useQuery } from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { useCallback, useState } from "react";
import { api } from "@/features/api/utils/api";
import type { Score } from "../actions/submit-memory-score";
import type { MemoryAnnouncement } from "../hooks/use-memory-game";
import { useMemoryGame } from "../hooks/use-memory-game";
import { useSaveGame } from "../hooks/use-save-game";
import { dealCards } from "../utils/deal-cards";
import { deckQuery } from "../utils/deck-queries";
import { GameClock } from "./game-clock";
import { GameCompleteDialog } from "./game-complete-dialog";
import { GamesNotice } from "./games-notice";
import { GlobalBestBadge } from "./global-best-badge";
import { MemoryBoardHeader } from "./memory-board-header";
import { MemoryBoardSkeleton } from "./memory-board-skeleton";
import { MemoryCardButton } from "./memory-card";
import { MemoryGrid } from "./memory-grid";

/** What the live region says of the latest event, in the page's language. */
const useAnnouncementText = () => {
  const t = useTranslations("Games");
  return (
    announcement: MemoryAnnouncement | null,
    images: readonly DeckImage[],
    altOf: (image: DeckImage) => string
  ) => {
    if (!announcement) {
      return "";
    }
    if (announcement.kind === "miss") {
      return t("announceMiss");
    }
    if (announcement.kind === "complete") {
      return t("announceComplete", {
        moves: announcement.moves,
        time: formatTime(announcement.timeMs),
      });
    }
    const image = images.find(({ id }) => id === announcement.imageId);
    return t("announceMatch", { alt: image ? altOf(image) : "" });
  };
};

const deckFailed = (retry: () => void) => (
  <GamesNotice kind="deckFailed" onRetry={retry} />
);

/**
 * One game on a dealt deck: the header (moves, the clock, the best on the
 * leaderboard), the cards, the live region and the dialog at the end. The
 * deck is dealt once, in the browser; a new game is a new round, so this
 * remounts with new Images and starts from nothing.
 */
const MemoryRound = ({
  images,
  onNewGame,
}: {
  images: readonly DeckImage[];
  onNewGame: () => void;
}) => {
  const t = useTranslations("Games");
  const language = useAOFAltLanguage();
  const announce = useAnnouncementText();
  const [cards] = useState(() => dealCards(images));
  const [open, setOpen] = useState(false);
  const { retry, save, score, view } = useSaveGame();
  const onComplete = useCallback(
    (result: Score) => {
      setOpen(true);
      save(result);
    },
    [save]
  );
  const game = useMemoryGame(cards, { onComplete });
  const finished = game.status === "complete";
  const locked = game.status === "checking" || finished;
  const altOf = (image: DeckImage) => aofAltFor(image.alt, language);
  const header = (
    <MemoryBoardHeader
      best={<GlobalBestBadge className="ml-auto" />}
      clock={<GameClock startedAt={game.startedAt} timeMs={game.timeMs} />}
      moves={game.moves}
      onNewGame={onNewGame}
    />
  );
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 px-2">
      <p className="sr-only" role="status">
        {announce(game.announcement, images, altOf)}
      </p>
      <MemoryGrid header={header} label={t("title")}>
        {game.cards.map((card) => (
          <MemoryCardButton
            card={card}
            isFaceUp={card.isFaceUp}
            isLocked={locked}
            isMatched={card.isMatched}
            key={card.cardId}
            language={language}
            onFlip={game.flip}
            position={card.index + 1}
          />
        ))}
      </MemoryGrid>
      {finished && score ? (
        <GameCompleteDialog
          moves={score.moves}
          onOpenChange={setOpen}
          onPlayAgain={onNewGame}
          onRetry={retry}
          open={open}
          submit={view}
          timeMs={score.timeMs}
        />
      ) : null}
    </div>
  );
};

/**
 * Memory's board: the deck of this round, asked of the API once the page is in
 * the browser (a draw is random, so it cannot be prerendered or kept), behind
 * the skeleton; then a round. A new game asks for a new deck. Failures are
 * told here, not in a toast: nothing else is on screen to show them.
 */
export const MemoryBoard = ({ canUpload }: { canUpload: boolean }) => {
  const [round, setRound] = useState(0);
  const query = useQuery(deckQuery(api, round));
  const newGame = useCallback(() => setRound((current) => current + 1), []);
  return (
    <AOFQueryView
      failed={deckFailed}
      forbidden={<GamesNotice kind="forbidden" />}
      query={query}
      skeleton={<MemoryBoardSkeleton />}
    >
      {({ images, needed }) =>
        images.length < needed ? (
          <GamesNotice
            canUpload={canUpload}
            have={images.length}
            kind="needMore"
            needed={needed}
          />
        ) : (
          <MemoryRound images={images} key={round} onNewGame={newGame} />
        )
      }
    </AOFQueryView>
  );
};
