import type {
  DeckBody,
  DeckImage,
} from "@allonfire/api/features/laura/games/constants/schemas";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";

const IMAGE_SIZE = { height: 600, width: 800 };

/** One deck Image as the API answers it. */
export const deckImage = (id: string): DeckImage => ({
  alt: { en: `Sea ${id}`, it: `Mare ${id}` },
  blurDataUrl: "data:image/webp;base64,AAAA",
  ...IMAGE_SIZE,
  id,
  srcSet: [
    { url: `https://cdn.test/${id}-400.avif`, width: 400 },
    { url: `https://cdn.test/${id}-800.avif`, width: 800 },
  ],
});

/** A deck of `count` Images (a whole board's by default). */
export const deckBody = (count: number = MEMORY_RULE.PAIRS): DeckBody => ({
  images: Array.from({ length: count }, (_, index) =>
    deckImage(`deck-${index + 1}`)
  ),
  needed: MEMORY_RULE.PAIRS,
});
