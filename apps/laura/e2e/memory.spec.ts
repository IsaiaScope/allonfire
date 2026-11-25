import { API } from "@allonfire/api/shared/constants/api";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import { expect, type Page, test } from "@playwright/test";
import { GAMES } from "../src/features/games/constants/games";
import { LAURA } from "../src/shared/constants/laura";
import { enT } from "../src/shared/tests/translators";
import { signInAsAdmin } from "./pages";
import { deletePhoto, uploadPhoto } from "./photos";

const PHOTOS = MEMORY_RULE.PAIRS;
const DECK_URL = `${LOCAL.URL.API_E2E}${API.PATH.LAURA.GAMES.DECK}`;

const uploaded: string[] = [];
const IS_UP = /: /;
/** Rank, player, moves, time, date. */
const MOVES_COLUMN = 2;
const IS_MATCHED = /, matched: /;

test.beforeEach(async ({ page }, { project }) => {
  await signInAsAdmin(page);
  // The Fixture holds two Laura photos: the deck needs more than that.
  const photos = await Promise.all(
    Array.from({ length: PHOTOS }, () => uploadPhoto(page, project.name))
  );
  uploaded.push(...photos.map(({ id }) => id));
});

test.afterEach(async ({ page }) => {
  await Promise.all(uploaded.splice(0).map((id) => deletePhoto(page, id)));
});

const board = (page: Page) => page.locator("[data-slot=memory-grid]");
const cards = (page: Page) => board(page).getByRole("button");

/** The picture a card's label names once it is up or matched, or null while it is down. */
/** The picture a card's label names once it is up or matched, or null while it is down. */
const altIn = (label: string) => {
  const at = label.indexOf(": ");
  return at === -1 ? null : label.slice(at + 2);
};

const openMemory = async (page: Page) => {
  await page.goto(LAURA.PAGE.MEMORY);
  await expect(cards(page)).toHaveCount(MEMORY_RULE.CARDS);
};

/** Turns a card up with the keyboard and answers the picture it shows. */
const turn = async (page: Page, index: number) => {
  const card = cards(page).nth(index);
  await card.focus();
  await page.keyboard.press(index % 2 === 0 ? "Enter" : "Space");
  await expect(card).toHaveAttribute("aria-label", IS_UP);
  const alt = altIn((await card.getAttribute("aria-label")) ?? "");
  expect(alt).not.toBeNull();
  return alt ?? "";
};

/** What the player remembers: each card seen so far with its picture, and the cards found. */
type Memory = { done: Set<number>; known: Map<number, string>; moves: number };

const emptyMemory = (): Memory => ({
  done: new Set(),
  known: new Map(),
  moves: 0,
});

const unseenIn = ({ known }: Memory) =>
  Array.from({ length: MEMORY_RULE.CARDS }, (_, index) => index).filter(
    (index) => !known.has(index)
  );

/** Another card, not yet found, that shows the same picture as `index`. */
const twinOf = ({ done, known }: Memory, index: number) =>
  [...known.entries()].find(
    ([other, alt]) =>
      other !== index && !done.has(other) && alt === known.get(index)
  )?.[0];

/** A pair rests face up before it counts: the board takes no card until then. */
const settled = (page: Page, index: number) =>
  expect(cards(page).nth(index)).toHaveAttribute("aria-label", IS_MATCHED);

/** The last pair ends the game, whose dialog covers the board: wait for that instead. */
const settle = (page: Page, memory: Memory, index: number) =>
  memory.done.size + 2 >= MEMORY_RULE.CARDS
    ? expect(page.getByRole("dialog")).toBeVisible()
    : settled(page, index);

const found = async (page: Page, memory: Memory, one: number, two: number) => {
  await turn(page, two);
  await settle(page, memory, two);
  memory.done.add(one);
  memory.done.add(two);
};

/** One move: a pair already seen, or a new card and then its twin or one more new card. */
const playMove = async (page: Page, memory: Memory) => {
  memory.moves += 1;
  const seenTwice = [...memory.known.keys()].find(
    (index) => !memory.done.has(index) && twinOf(memory, index) !== undefined
  );
  if (seenTwice !== undefined) {
    await turn(page, seenTwice);
    await found(page, memory, seenTwice, twinOf(memory, seenTwice) ?? 0);
    return;
  }
  const [first = 0, second = 0] = unseenIn(memory);
  memory.known.set(first, await turn(page, first));
  const twin = twinOf(memory, first);
  if (twin !== undefined) {
    await found(page, memory, first, twin);
    return;
  }
  memory.known.set(second, await turn(page, second));
  if (memory.known.get(second) === memory.known.get(first)) {
    await settle(page, memory, second);
    memory.done.add(first);
    memory.done.add(second);
    return;
  }
  // A miss turns back by itself.
  await expect(cards(page).nth(second)).toHaveAttribute(
    "aria-label",
    enT("Games.cardFaceDown", { position: second + 1 })
  );
};

/**
 * Plays a whole game from the keyboard like a player with a memory.
 * Answers the moves it took (one move is two cards turned).
 */
const playToTheEnd = async (
  page: Page,
  memory: Memory = emptyMemory()
): Promise<number> => {
  if (memory.done.size >= MEMORY_RULE.CARDS) {
    return memory.moves;
  }
  await playMove(page, memory);
  return playToTheEnd(page, memory);
};

// Every project signs in as the same Member, and two whole games of one Member
// cannot overlap: the API refuses a save that ends sooner after the last one
// than it takes to play (429). So one project plays, and plays once.
test("plays a whole game from the keyboard, finds the dialog and the leaderboard row", async ({
  page,
}, { project }) => {
  // biome-ignore lint/suspicious/noSkippedTests: the other projects must not play at the same time
  test.skip(project.name !== "chromium");
  await openMemory(page);
  const moves = await playToTheEnd(page);
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  const [announced = ""] = enT("Games.announceComplete", {
    moves,
    time: "",
  }).split(",");
  // The board is inert behind the dialog, so its live region is found by CSS.
  await expect(
    page.locator("[role=status]", { hasText: announced })
  ).toBeAttached();
  await page.getByRole("link", { name: enT("Games.viewLeaderboard") }).click();
  await expect(page).toHaveURL(new RegExp(`${LAURA.PAGE.LEADERBOARD}$`));
  // The board keeps each Member's best game: this one, or a better one from before.
  const mine = page
    .getByRole("row")
    .filter({ has: page.locator("[aria-current=true]") });
  const bestMoves = () =>
    mine
      .locator("td")
      .nth(MOVES_COLUMN)
      .innerText()
      .then((text) => Number(text));
  await expect.poll(bestMoves).toBeLessThanOrEqual(moves);
  await page.reload();
  await expect.poll(bestMoves).toBeLessThanOrEqual(moves);
});

for (const [name, size] of [
  ["a phone", SCREEN.VIEWPORT.PHONE],
  ["a landscape phone", SCREEN.VIEWPORT.PHONE_LANDSCAPE],
] as const) {
  test(`fits ${name}: every card inside the screen, at touch size, with no scrolling`, async ({
    page,
  }) => {
    await page.setViewportSize({ height: size.HEIGHT, width: size.WIDTH });
    await openMemory(page);
    const boxes = await cards(page).evaluateAll((nodes) =>
      nodes.map((node) => node.getBoundingClientRect().toJSON())
    );
    for (const box of boxes) {
      expect(box.width).toBeGreaterThanOrEqual(GAMES.MEMORY.CARD.MIN_TARGET_PX);
      expect(box.height).toBeGreaterThanOrEqual(
        GAMES.MEMORY.CARD.MIN_TARGET_PX
      );
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.top).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(size.WIDTH);
      expect(box.bottom).toBeLessThanOrEqual(size.HEIGHT);
    }
    const scrolls = await page.evaluate(
      () => document.documentElement.scrollHeight > window.innerHeight
    );
    expect(scrolls).toBe(false);
  });
}

test("asks for one deck a visit and none on the leaderboard page", async ({
  page,
}) => {
  let decks = 0;
  page.on("request", (request) => {
    if (request.url().startsWith(DECK_URL)) {
      decks += 1;
    }
  });
  await openMemory(page);
  expect(decks).toBe(1);
  await page.goto(LAURA.PAGE.LEADERBOARD);
  await expect(
    page.getByRole("heading", { name: enT("Games.yourStats") })
  ).toBeVisible();
  expect(decks).toBe(1);
});

test("refuses the deck to someone with no Session", async ({ playwright }) => {
  const anonymous = await playwright.request.newContext();
  const response = await anonymous.get(DECK_URL);
  expect(response.status()).toBe(HTTP.STATUS.UNAUTHORIZED);
  await anonymous.dispose();
});
