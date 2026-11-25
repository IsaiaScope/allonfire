// @module-tag unit

import { objectKeys } from "@allonfire/core/shared/utils/object";
import { imageBodySchema } from "@allonfire/storage/features/image/constants/schemas";
import {
  deckBodySchema,
  deckImageSchema,
  leaderboardBodySchema,
  scoreInputSchema,
} from "../games/constants/schemas";

const IMAGE = imageBodySchema.parse({
  access: "PRIVATE",
  alt: { en: "a", it: "a" },
  apps: ["LAURA"],
  blurDataUrl: "blur",
  bytes: 10,
  createdAt: new Date().toISOString(),
  height: 3,
  id: "i1",
  key: "k.avif",
  srcSet: [{ url: "https://example.test/k", width: 400 }],
  version: "v",
  width: 4,
});

describe("scoreInputSchema", () => {
  it("accepts a whole game", () => {
    expect(
      scoreInputSchema.safeParse({ moves: 8, timeMs: 40_000 }).success
    ).toBe(true);
  });

  it.each([
    [{ moves: "8", timeMs: 40_000 }],
    [{ moves: 8.5, timeMs: 40_000 }],
    [{ moves: 8 }],
    [{ timeMs: 40_000 }],
  ])("rejects %j", (body) => {
    expect(scoreInputSchema.safeParse(body).success).toBe(false);
  });
});

describe("deckImageSchema", () => {
  it.each(["key", "access", "apps", "bytes", "version"])(
    "strips %s from an Image",
    (field) => {
      const parsed = deckImageSchema.parse(IMAGE);
      expect(parsed).not.toHaveProperty(field);
    }
  );

  it("keeps what a card draws", () => {
    expect(
      objectKeys(deckImageSchema.parse(IMAGE)).sort((a, b) =>
        a.localeCompare(b)
      )
    ).toEqual(["alt", "blurDataUrl", "height", "id", "srcSet", "width"]);
  });
});

describe("deckBodySchema", () => {
  it("holds the Images and how many are needed", () => {
    expect(deckBodySchema.parse({ images: [IMAGE], needed: 6 }).needed).toBe(6);
  });
});

describe("leaderboardBodySchema", () => {
  it("names an email beside the name in an entry, and no user id", () => {
    const entry = leaderboardBodySchema.shape.entries.element.shape;
    expect(entry).not.toHaveProperty("userId");
    expect(entry).toHaveProperty("email");
  });
});
