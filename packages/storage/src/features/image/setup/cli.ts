// The deploy's `storage-setup` service (docker/docker-compose.prod.yml): the
// Images' bucket, its policy and the shipped Images, before the API starts.
import { env } from "../../../environment/environment";
import { setupImageBucket } from "./setup-bucket";

await setupImageBucket(env.STORAGE_BUCKET);
