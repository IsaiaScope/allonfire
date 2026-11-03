import { fillLocalDatabaseEnv } from "@allonfire/database/features/test-database/utils/local-env";
import { fillLocalStorageEnv } from "./src/features/test-bucket/utils/local-env";

// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test needs Postgres up.
fillLocalDatabaseEnv();
// The storage env validates at import too; nothing connects until a request.
fillLocalStorageEnv();
