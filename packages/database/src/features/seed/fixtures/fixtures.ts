import { IMAGE } from "./images";
import { PASSWORD, USER, USERS } from "./users";

/**
 * Every Fixture: the Users of the App by Role grid (`FIXTURE.USER.<APP>.<ROLE>`,
 * plus `ADMIN_EVERYWHERE` and `NO_MEMBERSHIP`), their one `PASSWORD`, the list
 * the seed writes (`USERS`) and the Images (`FIXTURE.IMAGE.*`). They exist
 * only in Test databases.
 */
export const FIXTURE = { IMAGE, PASSWORD, USER, USERS } as const;
