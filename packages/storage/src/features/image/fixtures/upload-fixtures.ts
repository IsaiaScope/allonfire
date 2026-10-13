import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { objectValues } from "@allonfire/core/shared/utils/object";
import { FIXTURE } from "@allonfire/database/features/seed/fixtures/fixtures";
import { putImageObject } from "../objects/image-objects";
import { prepareImage } from "../prepare/prepare-image";
import { IMAGE_FIXTURE_FILES } from "./constants/files";

/** An Image Fixture: its key, and its source file in `IMAGE_FIXTURE_FILES`. */
export type FixtureFile = { key: string; source: string };

/** One Fixture's file into `bucket`, through the real pipeline, under its key. */
export async function putFixtureImage(
  bucket: string,
  { key, source }: FixtureFile
): Promise<void> {
  const { buffer } = await prepareImage(
    readFileSync(resolve(IMAGE_FIXTURE_FILES, source))
  );
  await putImageObject(key, buffer, bucket);
}

/**
 * Every Image Fixture's file into `bucket`, replacing what is there: what
 * Production would hold for the rows `seedFixtures` writes.
 */
export async function uploadImageFixtures(bucket: string): Promise<void> {
  await Promise.all(
    objectValues(FIXTURE.IMAGE).map((fixture) =>
      putFixtureImage(bucket, fixture)
    )
  );
}
