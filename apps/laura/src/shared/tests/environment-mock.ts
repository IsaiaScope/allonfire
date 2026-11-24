import { LOCAL } from "@allonfire/config/local/addresses";

/**
 * The App's env (`@/environment/environment`), which is read at import and
 * which a unit test lacks: the server reaches the API MSW answers.
 * `vi.mock("@/environment/environment", () => import(…))`.
 */
export const env = { API_URL: LOCAL.URL.TEST_API };
