// @module-tag integration

import { App, ImageAccess } from "../../../../generated/prisma/enums";
import { prisma } from "../../prisma/client";
import { createImages, type NewImage } from "../image.service";
import { randomImages } from "../random-images";

// Runs against the run's Test database. Rows are keyed by KEY_PREFIX and removed after.
const USER_ID = "image-random-test-user";
const KEY_PREFIX = "image-random-test-";
const { BACK_OFFICE: OFFICE, LAURA } = App;
const IN_LAURA: App[] = [LAURA];
const SIX = 6;
/** More than the Test database holds: asks for every visible Image. */
const ALL = 1000;
const FIRST = () => 0;
const LAST = () => 0.999;

const image = (
  key: string,
  apps: App[] = [LAURA],
  access?: ImageAccess
): NewImage => ({
  access,
  alt: { en: key, it: key },
  apps,
  blurDataUrl: "data:image/webp;base64,AAAA",
  bytes: 1000,
  height: 600,
  key: `${KEY_PREFIX}${key}.avif`,
  uploadedBy: USER_ID,
  width: 800,
});

const make = async (names: string[], apps?: App[], access?: ImageAccess) =>
  (await createImages(names.map((name) => image(name, apps, access)))).map(
    ({ id }) => id
  );

/** This file's Images among what a draw returned, in its order. */
const oursIn = (drawn: readonly { id: string; key: string }[]) =>
  drawn.filter(({ key }) => key.startsWith(KEY_PREFIX)).map(({ id }) => id);

beforeEach(async () => {
  await prisma.image.deleteMany({ where: { key: { startsWith: KEY_PREFIX } } });
  await prisma.user.deleteMany({ where: { id: USER_ID } });
  await prisma.user.create({
    data: { email: "image-random@image-service.test", id: USER_ID },
  });
});

afterAll(async () => {
  await prisma.$disconnect();
});

describe("randomImages", () => {
  it("returns `count` distinct Images placed in the App", async () => {
    await make(["a", "b", "c", "d", "e", "f", "g", "h"]);
    const drawn = await randomImages({
      app: LAURA,
      count: SIX,
      enterable: IN_LAURA,
    });
    expect(drawn).toHaveLength(SIX);
    expect(new Set(drawn.map(({ id }) => id)).size).toBe(SIX);
    expect(drawn.every(({ apps }) => apps.includes(LAURA))).toBe(true);
  });

  it("never returns an Image that is only in another App", async () => {
    const [laura] = await make(["laura"]);
    const [office] = await make(["office"], [OFFICE]);
    const drawn = await randomImages({
      app: LAURA,
      count: ALL,
      enterable: [LAURA, OFFICE],
    });
    expect(oursIn(drawn)).toContain(laura);
    expect(oursIn(drawn)).not.toContain(office);
  });

  it("returns a private Image to someone who enters the App, a public one to anyone", async () => {
    const [priv] = await make(["private"]);
    const [pub] = await make(["public"], [LAURA], ImageAccess.PUBLIC);
    const inside = await randomImages({
      app: LAURA,
      count: ALL,
      enterable: IN_LAURA,
    });
    const outside = await randomImages({
      app: LAURA,
      count: ALL,
      enterable: [],
    });
    expect(oursIn(inside).sort()).toEqual([priv, pub].sort());
    expect(oursIn(outside)).toEqual([pub]);
  });

  it("returns every Image there is when there are fewer than `count`", async () => {
    const ids = await make(["a", "b"]);
    const drawn = await randomImages({
      app: LAURA,
      count: ALL,
      enterable: IN_LAURA,
    });
    expect(oursIn(drawn).sort((a, b) => a.localeCompare(b))).toEqual(
      ids.sort((a, b) => a.localeCompare(b))
    );
    expect(drawn.length).toBeLessThan(ALL);
  });

  it("draws from `random`: the same input gives the same draw, another gives another", async () => {
    await make(["a", "b", "c", "d", "e", "f", "g", "h", "i", "j"]);
    const draw = async (random: () => number) =>
      (
        await randomImages({
          app: LAURA,
          count: SIX,
          enterable: IN_LAURA,
          random,
        })
      ).map(({ id }) => id);
    expect(await draw(FIRST)).toEqual(await draw(FIRST));
    expect(await draw(LAST)).toEqual(await draw(LAST));
    expect(await draw(FIRST)).not.toEqual(await draw(LAST));
  });
});
