// The pictures' bucket, created closed: the deploy's
// `storage-setup` service (docker/docker-compose.prod.yml) before the API
// starts, and `pnpm --filter @allonfire/storage image:setup` (dev:setup) for
// the Local bucket.
import { env } from "../../../environment/environment";
import { setupImageBucket } from "./setup-bucket";

await setupImageBucket(env.STORAGE_BUCKET);
