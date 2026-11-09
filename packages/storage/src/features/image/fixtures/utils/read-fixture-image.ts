import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { IMAGE_FIXTURE } from "../constants/files";

/** An Image Fixture's bytes, by file name (`IMAGE_FIXTURE.FILE.*`, or a `FIXTURE.IMAGE` `source`). */
export const readFixtureImage = (name: string) =>
  readFileSync(resolve(IMAGE_FIXTURE.DIR, name));
