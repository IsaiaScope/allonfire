// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  HeadObjectCommand,
  ListBucketsCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "../../../environment/environment";
import { storedObjectUrl } from "../../../shared/utils/stored-object-url";
import { IMAGE } from "../../image/constants/image";
import { s3 } from "../../s3/client";
import { dropTestBucketsOf, sweepTestBuckets } from "../bucket";
import { testBucketName } from "../names";

const RUN_BUCKET = /^allonfire-test-storage-/;

it("holds every Image Fixture as AVIF, cached like an upload, in the run's closed bucket", async () => {
  expect(env.STORAGE_BUCKET).toMatch(RUN_BUCKET);
  const stored = await Promise.all(
    objectValues(FIXTURE.IMAGE).map(({ key }) =>
      s3.send(new HeadObjectCommand({ Bucket: env.STORAGE_BUCKET, Key: key }))
    )
  );
  for (const head of stored) {
    expect(head.ContentType).toBe(IMAGE.FORMAT.CONTENT_TYPE);
    expect(head.CacheControl).toBe(IMAGE.CACHE.CONTROL);
  }
  const [first] = objectValues(FIXTURE.IMAGE);
  const anonymous = await fetch(
    storedObjectUrl(env.STORAGE_ENDPOINT, env.STORAGE_BUCKET, first?.key ?? "")
  );
  expect(anonymous.status).toBe(HTTP.STATUS.FORBIDDEN);
});

it("lets two runs sweep the same crashed run's bucket at once", async () => {
  const twoDaysAgo =
    Math.floor(Date.now() / UNIT.MS_PER_SECOND) - 2 * UNIT.SECONDS_PER_DAY;
  // Empty, and stale by its name: any package's run sweeps it, this one's or
  // another running beside it, so only "gone, and nobody threw" is certain.
  const stale = testBucketName("sweeptest", `${twoDaysAgo}_crash1`);
  await s3.send(new CreateBucketCommand({ Bucket: stale }));
  await Promise.all([sweepTestBuckets(), sweepTestBuckets()]);
  const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
  expect(Buckets.map(({ Name }) => Name)).not.toContain(stale);
});

it("drops every earlier run of a label, however young and whatever it holds, and no other label's", async () => {
  const now = Math.floor(Date.now() / UNIT.MS_PER_SECOND);
  const mine = testBucketName("solotest", `${now}_young1`);
  const other = testBucketName("solotest-two", `${now}_young2`);
  await Promise.all(
    [mine, other].map((Bucket) => s3.send(new CreateBucketCommand({ Bucket })))
  );
  await s3.send(new PutObjectCommand({ Body: "x", Bucket: mine, Key: "left" }));
  try {
    const dropped = await dropTestBucketsOf("solotest");
    expect(dropped).toContain(mine);
    expect(dropped).not.toContain(other);
    const { Buckets = [] } = await s3.send(new ListBucketsCommand({}));
    const left = Buckets.map(({ Name }) => Name);
    expect(left).not.toContain(mine);
    expect(left).toContain(other);
  } finally {
    await s3.send(new DeleteBucketCommand({ Bucket: other }));
  }
});
