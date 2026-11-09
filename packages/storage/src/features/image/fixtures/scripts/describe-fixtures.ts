// Prints what `prepareImage` makes of each Image Fixture file, for
// `FIXTURE.IMAGE` in @allonfire/database's `seed/fixtures/images.ts`:
//   pnpm --filter @allonfire/storage exec tsx src/features/image/fixtures/scripts/describe-fixtures.ts
import { readdirSync } from "node:fs";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prepareImage } from "../../prepare/prepare-image";
import { IMAGE_FIXTURE } from "../constants/files";
import { readFixtureImage } from "../utils/read-fixture-image";

const sources = readdirSync(IMAGE_FIXTURE.DIR).filter(
  (name) => !(name.startsWith("._") || name.endsWith(".gif"))
);
const prepared = await Promise.all(
  sources.map((source) => prepareImage(readFixtureImage(source)))
);
for (const [
  index,
  { blurDataUrl, bytes, height, width },
] of prepared.entries()) {
  process.stdout.write(
    `${stringifyJson({ blurDataUrl, bytes, height, source: sources[index], width })}\n`
  );
}
