import { LOCAL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";
import { fillLocalDatabaseEnv } from "@allonfire/database/features/test-database/utils/local-env";
import { AUTH } from "./src/shared/constants/auth";

// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so only the integration test needs Postgres.
fillLocalDatabaseEnv();
// features/next reads which App it serves at import.
process.env.AUTH_APP ??= App.BACK_OFFICE;
process.env.API_AUTH_URL ??= `${LOCAL.URL.TEST_API}${AUTH.PATH.BASE}`;
