import { fillLocalDatabaseEnv } from "@allonfire/database/features/test-database/local-env";
import { fillLocalStorageEnv } from "./src/features/test-bucket/local-env";

// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so no test needs Postgres up.
fillLocalDatabaseEnv();
// The storage env validates at import too; nothing connects until a request.
fillLocalStorageEnv();
