// @module-tag integration

import {
  CAN_EMULATE_MEDIA,
  withReducedMotion,
} from "@allonfire/ui/shared/tests/emulated-media";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { enT } from "@/shared/tests/translators";
import { deckImage } from "../../tests/deck-body";
import type { MemoryCard } from "../../utils/deal-cards";
import { MemoryCardButton } from "../memory-card";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  ...(await import("@allonfire/ui/shared/tests/aof-image-mock")),
  AOFStorageImage: ({ className }: { className?: string }) => (
    <span className={className} data-testid="picture" />
  ),
}));

const IMAGE = deckImage("sea");
const CARD: MemoryCard = { cardId: "sea-a", image: IMAGE, imageId: IMAGE.id };
const ALT = IMAGE.alt.en;

const draw = (
  state: { isFaceUp?: boolean; isLocked?: boolean; isMatched?: boolean },
  onFlip = vi.fn()
) =>
  renderInApp({
    children: (
      <div style={{ height: 200, width: 150 }}>
        <MemoryCardButton
          card={CARD}
          isFaceUp={state.isFaceUp ?? false}
          isLocked={state.isLocked ?? false}
          isMatched={state.isMatched ?? false}
          language="en"
          onFlip={onFlip}
          position={3}
        />
      </div>
    ),
  });

describe("MemoryCardButton", () => {
  it("is a button named face down, and turns on a click", async () => {
    const onFlip = vi.fn();
    await draw({}, onFlip);
    const card = page.getByRole("button", {
      name: enT("Games.cardFaceDown", { position: 3 }),
    });
    await card.click();
    expect(onFlip).toHaveBeenCalledTimes(1);
  });

  it("is named with its picture's alt once turned up", async () => {
    await draw({ isFaceUp: true });
    await expect
      .element(
        page.getByRole("button", {
          name: enT("Games.cardFaceUp", { alt: ALT, position: 3 }),
        })
      )
      .toBeVisible();
  });

  it("is aria-disabled, never disabled, once matched, and a click does nothing", async () => {
    const onFlip = vi.fn();
    await draw({ isFaceUp: true, isMatched: true }, onFlip);
    const card = page.getByRole("button", {
      name: enT("Games.cardMatched", { alt: ALT, position: 3 }),
    });
    await expect.element(card).toHaveAttribute("aria-disabled", "true");
    expect(card.element().hasAttribute("disabled")).toBe(false);
    await card.click({ force: true });
    expect(onFlip).not.toHaveBeenCalled();
  });

  it("ignores a click while the board holds a pair", async () => {
    const onFlip = vi.fn();
    await draw({ isLocked: true }, onFlip);
    const card = page.getByRole("button");
    await expect.element(card).toHaveAttribute("aria-disabled", "true");
    await card.click({ force: true });
    expect(onFlip).not.toHaveBeenCalled();
  });

  it("turns over in time where motion is welcome", async () => {
    await draw({});
    const turn = document.querySelector("[data-slot=memory-card-turn]");
    expect(turn).not.toBeNull();
    expect(
      Number.parseFloat(getComputedStyle(turn as Element).transitionDuration)
    ).toBeGreaterThan(0);
  });

  describe.runIf(CAN_EMULATE_MEDIA)("for reduced motion", () => {
    it("turns over at once", async () => {
      await withReducedMotion(async () => {
        await draw({});
        const turn = document.querySelector("[data-slot=memory-card-turn]");
        expect(getComputedStyle(turn as Element).transitionDuration).toBe("0s");
      });
    });
  });
});
