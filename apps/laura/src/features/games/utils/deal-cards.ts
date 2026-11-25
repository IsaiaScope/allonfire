import type { DeckImage } from "@allonfire/api/features/laura/games/constants/schemas";

/** One card: its own id, and the Image whose pair it is in. */
export type MemoryCard = { cardId: string; image: DeckImage; imageId: string };

/**
 * Two cards of each Image in a random order (Fisher-Yates, from `random` so a
 * test fixes it). Called only once the deck is in the browser: a random order
 * cannot be made while the page prerenders.
 */
export const dealCards = (
  images: readonly DeckImage[],
  random: () => number = Math.random
): MemoryCard[] => {
  const cards = images.flatMap((image) =>
    ["a", "b"].map((side) => ({
      cardId: `${image.id}-${side}`,
      image,
      imageId: image.id,
    }))
  );
  for (let at = cards.length - 1; at > 0; at -= 1) {
    const other = Math.floor(random() * (at + 1));
    const kept = cards[at];
    const swapped = cards[other];
    if (kept && swapped) {
      cards[at] = swapped;
      cards[other] = kept;
    }
  }
  return cards;
};
