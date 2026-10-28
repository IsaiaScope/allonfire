// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import sharp from "sharp";
import { env } from "../../../environment/environment";
import { storedObjectUrl } from "../../../shared/utils/stored-object-url";
import { IMAGE } from "../../image/constants/image";
import { s3 } from "../../s3/client";
import { putObject } from "../../s3/objects";
import { IMAGE_SERVER } from "../constants/image-server";
import { pictureLink } from "../sign";

const { key } = FIXTURE.IMAGE.PUBLIC_IN_BACK_OFFICE;
const WIDTH = 640;
/** The signature segment of a link. */
const SIGNATURE = /\/[\w-]{43}\//;
const AVIF = { [HTTP.HEADER.ACCEPT]: IMAGE.FORMAT.CONTENT_TYPE };
const WEBP = { [HTTP.HEADER.ACCEPT]: "image/webp" };
const A_YEAR_S = 365 * 24 * 60 * 60;
const AN_HOUR_MS = 60 * 60 * 1000;
/** A link signed for this test alone: no earlier run left it in the cache. */
const freshLink = (lifeMs: number) =>
  pictureLink({ expiresAt: new Date(Date.now() + lifeMs), key, width: WIDTH });
const MAX_AGE = /max-age=(\d+)/;
/** How long the image server tells the browser to keep a response, in seconds. */
const maxAgeOf = (response: Response) => {
  const [, seconds] =
    response.headers.get(HTTP.HEADER.CACHE_CONTROL)?.match(MAX_AGE) ?? [];
  return Number(seconds);
};
/** What the image cache says it did with a request. */
const CACHE_STATUS = "X-Cache-Status";
const AN_HOUR_AGO = new Date(Date.now() - 60 * 60 * 1000);
/** A bucket outside the image server's allowed sources: neither the Apps' nor a test run's. */
const OUTSIDE = `allonfire-outside-${process.pid}`;

describe("the image server, through signed links", () => {
  it("serves a signed link at its width, as AVIF for a browser that takes it", async () => {
    const response = await fetch(pictureLink({ key, width: WIDTH }), {
      headers: AVIF,
    });
    expect(response.status).toBe(HTTP.STATUS.OK);
    expect(response.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.FORMAT.CONTENT_TYPE
    );
    const { width } = await sharp(
      Buffer.from(await response.arrayBuffer())
    ).metadata();
    expect(width).toBe(WIDTH);
  });

  it("refuses an unsigned or tampered link (403)", async () => {
    const signed = pictureLink({ key, width: WIDTH });
    const tampered = signed.replace(`rs:fit:${WIDTH}:0`, "rs:fit:2000:0");
    const unsigned = signed.replace(SIGNATURE, "/insecure/");
    const statuses = await Promise.all(
      [tampered, unsigned].map(async (link) => (await fetch(link)).status)
    );
    expect(statuses).toEqual([HTTP.STATUS.FORBIDDEN, HTTP.STATUS.FORBIDDEN]);
  });

  it("answers a link it has seen from the cache in front of it, never a tampered one", async () => {
    // An expiry to this second, so no earlier run cached this link.
    const signed = pictureLink({
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      key,
      width: WIDTH,
    });
    const first = await fetch(signed, { headers: AVIF });
    const second = await fetch(signed, { headers: AVIF });
    expect(first.headers.get(CACHE_STATUS)).toBe("MISS");
    // Within its second a HIT, after it checked with imgproxy (304).
    expect(["HIT", "REVALIDATED"]).toContain(second.headers.get(CACHE_STATUS));
    const tampered = signed.replace(SIGNATURE, "/insecure/");
    expect((await fetch(tampered)).status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("once its copy is older than the check window, asks imgproxy whether it changed and keeps it (304), never draws it again", async () => {
    // Its own expiry: the other tests' links, signed in the same second, differ.
    const link = freshLink(2 * AN_HOUR_MS);
    expect(
      (await fetch(link, { headers: AVIF })).headers.get(CACHE_STATUS)
    ).toBe("MISS");
    await new Promise((resolve) =>
      setTimeout(resolve, IMAGE_SERVER.CACHE_CHECK_SECONDS * UNIT.MS_PER_SECOND)
    );
    const later = await fetch(link, { headers: AVIF });
    expect(later.headers.get(CACHE_STATUS)).toBe("REVALIDATED");
  });

  it("tells the browser to keep a public picture a year, a private one only until its link expires", async () => {
    const forever = await fetch(pictureLink({ key, width: WIDTH }));
    const forAnHour = await fetch(freshLink(AN_HOUR_MS));
    expect(maxAgeOf(forever)).toBe(A_YEAR_S);
    expect(maxAgeOf(forAnHour)).toBeLessThanOrEqual(AN_HOUR_MS / 1000);
    expect(maxAgeOf(forAnHour)).toBeGreaterThan(AN_HOUR_MS / 1000 - 60);
  });

  it("answers WebP to a browser without AVIF, even once the AVIF is cached", async () => {
    const link = freshLink(AN_HOUR_MS);
    const avif = await fetch(link, { headers: AVIF });
    const webp = await fetch(link, { headers: WEBP });
    expect(avif.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe(
      IMAGE.FORMAT.CONTENT_TYPE
    );
    expect(webp.headers.get(HTTP.HEADER.CONTENT_TYPE)).toBe("image/webp");
  });

  it("never serves a cached private picture once its link has expired", async () => {
    const link = freshLink(2 * 1000);
    expect((await fetch(link, { headers: AVIF })).status).toBe(HTTP.STATUS.OK);
    expect((await fetch(link, { headers: AVIF })).status).toBe(HTTP.STATUS.OK);
    await expect
      .poll(async () => (await fetch(link, { headers: AVIF })).status, {
        interval: 250,
        timeout: (2 + IMAGE_SERVER.CACHE_CHECK_SECONDS + 1) * 1000,
      })
      .toBe(HTTP.STATUS.NOT_FOUND);
  }, 10_000);

  it("answers 404 once the link has expired", async () => {
    const expired = pictureLink({ expiresAt: AN_HOUR_AGO, key, width: WIDTH });
    expect((await fetch(expired)).status).toBe(HTTP.STATUS.NOT_FOUND);
  });

  it("never serves the bucket directly: an anonymous storage GET answers 403", async () => {
    const direct = storedObjectUrl(
      env.STORAGE_ENDPOINT,
      env.STORAGE_BUCKET,
      key
    );
    expect((await fetch(direct)).status).toBe(HTTP.STATUS.FORBIDDEN);
  });

  it("refuses a signed link to a bucket outside its allowed sources", async () => {
    await s3.send(new CreateBucketCommand({ Bucket: OUTSIDE }));
    try {
      const picture = await sharp({
        create: { background: "red", channels: 3, height: 8, width: 8 },
      })
        .png()
        .toBuffer();
      await putObject(OUTSIDE, key, picture, { contentType: "image/png" });
      const outside = pictureLink({ bucket: OUTSIDE, key, width: WIDTH });
      expect((await fetch(outside)).status).toBe(HTTP.STATUS.NOT_FOUND);
    } finally {
      await s3.send(new DeleteObjectCommand({ Bucket: OUTSIDE, Key: key }));
      await s3.send(new DeleteBucketCommand({ Bucket: OUTSIDE }));
    }
  });
});
