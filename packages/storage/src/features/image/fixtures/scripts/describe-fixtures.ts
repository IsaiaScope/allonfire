// Prints what `prepareImage` makes of each Image Fixture file, for
// `FIXTURE.IMAGE` in @allonfire/database's `seed/fixtures/images.ts`:
//   pnpm --filter @allonfire/storage exec tsx src/features/image/fixtures/scripts/describe-fixtures.ts
import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { stringifyJson } from "@allonfire/core/shared/utils/json";
import { prepareImage } from "../../prepare/prepare-image";
import { IMAGE_FIXTURE_FILES } from "../constants/files";

const sources = readdirSync(IMAGE_FIXTURE_FILES).filter(
  (name) => !(name.startsWith("._") || name.endsWith(".gif"))
);
const prepared = await Promise.all(
  sources.map((source) =>
    prepareImage(readFileSync(resolve(IMAGE_FIXTURE_FILES, source)))
  )
);
for (const [
  index,
  { blurDataUrl, bytes, height, width },
] of prepared.entries()) {
  process.stdout.write(
    `${stringifyJson({ blurDataUrl, bytes, height, source: sources[index], width })}\n`
  );
}
