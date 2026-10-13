// `pnpm db:seed:images`: the Image Fixtures' files into the Local bucket
// (`image`), for the rows `pnpm db:seed` writes in `local` mode.
import { env } from "../../../environment/environment";
import { uploadImageFixtures } from "./upload-fixtures";

await uploadImageFixtures(env.STORAGE_BUCKET);
