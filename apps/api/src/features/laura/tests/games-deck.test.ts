// @module-tag unit
import { sessionFor } from "@allonfire/auth/shared/tests/stub-auth";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { objectKeys } from "@allonfire/core/shared/utils/object";
import { App, ImageAccess } from "@allonfire/database/enums";
import { MEMORY_RULE } from "@allonfire/database/features/apps/laura/constants/memory-rule";
import type { ImageRecord } from "@allonfire/database/features/image/image.service";
import {
  pictureSrcSet,
  privateLinkExpiry,
} from "@allonfire/storage/features/image-server/sign";
import { API } from "../../../shared/constants/api";
import { deckBodySchema } from "../games/constants/schemas";
import type { LauraDeps } from "../utils/deps";
import { appWith, BACK_OFFICE_ADMIN, LAURA_USER } from "./laura-app";

const NOW = new Date("2026-11-20T10:30:00.000Z");

const record = (
  id: string,
  access: ImageAccess = ImageAccess.PUBLIC
): ImageRecord => ({
  access,
  alt: { en: `Sea ${id}`, it: `Mare ${id}` },
  apps: [App.LAURA],
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  createdAt: NOW,
  height: 600,
  id,
  key: `${id}.avif`,
  updatedAt: NOW,
  uploadedBy: "someone",
  version: "v1",
  width: 800,
});

const draw = (app: ReturnType<typeof appWith>) =>
  app.request(API.PATH.LAURA.GAMES.DECK);

describe("GET /laura/games/memory/deck", () => {
  it("answers 401 without a Session", async () => {
    expect((await draw(appWith({}, null))).status).toBe(
      HTTP.STATUS.UNAUTHORIZED
    );
  });

  it("answers 403 to someone Laura does not let in, and draws nothing", async () => {
    const randomImages = vi.fn(() => Promise.resolve([]));
    const res = await draw(
      appWith({ randomImages }, sessionFor(BACK_OFFICE_ADMIN))
    );
    expect(res.status).toBe(HTTP.STATUS.FORBIDDEN);
    expect(randomImages).not.toHaveBeenCalled();
  });

  it("answers the drawn Images with only what a card draws, and how many are needed", async () => {
    const randomImages = vi.fn(() =>
      Promise.resolve(["a", "b", "c", "d", "e", "f"].map((id) => record(id)))
    );
    const res = await draw(appWith({ randomImages }, sessionFor(LAURA_USER)));
    expect(res.status).toBe(HTTP.STATUS.OK);
    const body = deckBodySchema.parse(await res.json());
    expect(body.needed).toBe(MEMORY_RULE.PAIRS);
    expect(body.images).toHaveLength(MEMORY_RULE.PAIRS);
    for (const image of body.images) {
      expect(objectKeys(image).sort((a, b) => a.localeCompare(b))).toEqual([
        "alt",
        "blurDataUrl",
        "height",
        "id",
        "srcSet",
        "width",
      ]);
    }
    expect(randomImages).toHaveBeenCalledWith({
      app: App.LAURA,
      count: MEMORY_RULE.PAIRS,
      enterable: [App.LAURA],
    });
  });

  it("is still a 200 with fewer Images than a board needs", async () => {
    const res = await draw(
      appWith(
        { randomImages: () => Promise.resolve([record("a"), record("b")]) },
        sessionFor(LAURA_USER)
      )
    );
    const body = deckBodySchema.parse(await res.json());
    expect([res.status, body.images.length, body.needed]).toEqual([
      HTTP.STATUS.OK,
      2,
      MEMORY_RULE.PAIRS,
    ]);
  });

  it("keeps nothing: every request is a new draw", async () => {
    const randomImages = vi
      .fn<LauraDeps["randomImages"]>()
      .mockResolvedValueOnce([record("first")])
      .mockResolvedValueOnce([record("second")]);
    const app = appWith({ randomImages }, sessionFor(LAURA_USER));
    const first = deckBodySchema.parse(await (await draw(app)).json());
    const second = deckBodySchema.parse(await (await draw(app)).json());
    expect(randomImages).toHaveBeenCalledTimes(2);
    expect([first.images[0]?.id, second.images[0]?.id]).toEqual([
      "first",
      "second",
    ]);
  });

  it("signs a private Image's links to expire and a public one's never", async () => {
    vi.useFakeTimers({ now: NOW });
    try {
      const res = await draw(
        appWith(
          {
            randomImages: () =>
              Promise.resolve([
                record("pub", ImageAccess.PUBLIC),
                record("priv", ImageAccess.PRIVATE),
              ]),
          },
          sessionFor(LAURA_USER)
        )
      );
      const { images } = deckBodySchema.parse(await res.json());
      expect(images.map(({ srcSet }) => srcSet)).toEqual([
        pictureSrcSet("pub.avif"),
        pictureSrcSet("priv.avif", privateLinkExpiry(NOW)),
      ]);
    } finally {
      vi.useRealTimers();
    }
  });

  it("is never cached", async () => {
    const res = await draw(appWith({}, sessionFor(LAURA_USER)));
    expect(res.headers.get(HTTP.HEADER.CACHE_CONTROL)).toBe(
      HTTP.CACHE_CONTROL.NO_CACHE
    );
  });
});
