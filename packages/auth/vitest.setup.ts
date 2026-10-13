import { LOCAL, TEST_API_URL } from "@allonfire/config/local/addresses";
import { App } from "@allonfire/database/enums";
import { AUTH } from "./src/shared/constants/auth";

// `@allonfire/database` validates its env at import; the Prisma client never
// connects unless a query runs, so only the integration test needs Postgres.
// features/next reads which App it serves at import.
process.env.AUTH_APP ??= App.BACK_OFFICE;
process.env.API_AUTH_URL ??= `${TEST_API_URL}${AUTH.PATH.BASE}`;
process.env.DATABASE_URL ??= LOCAL.URL.DATABASE;
