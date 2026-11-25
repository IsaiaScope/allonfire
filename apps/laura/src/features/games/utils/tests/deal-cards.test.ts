// @module-tag unit

import { deckBody } from "../../tests/deck-body";
import { dealCards } from "../deal-cards";

const FIRST = () => 0;
const LAST = () => 0.99;
const { images } = deckBody();

describe("dealCards", () => {
  it("makes two cards of each Image, each with its own id", () => {
    const cards = dealCards(images, FIRST);
    expect(cards).toHaveLength(images.length * 2);
    expect(new Set(cards.map(({ cardId }) => cardId)).size).toBe(cards.length);
    for (const { id } of images) {
      expect(cards.filter(({ imageId }) => imageId === id)).toHaveLength(2);
    }
  });

  it("gives the same order for the same input and another for another", () => {
    const order = (random: () => number) =>
      dealCards(images, random).map(({ cardId }) => cardId);
    expect(order(FIRST)).toEqual(order(FIRST));
    expect(order(FIRST)).not.toEqual(order(LAST));
  });

  it("carries the Image a card shows", () => {
    for (const card of dealCards(images, FIRST)) {
      expect(card.image.id).toBe(card.imageId);
    }
  });
});
