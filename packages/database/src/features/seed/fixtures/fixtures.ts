import { IMAGE } from "./images";
import { MAIL_PROVIDER } from "./mail-provider";
import { DOMAIN, NEW_PASSWORD, PASSWORD, USER, USERS } from "./users";

/**
 * Every Fixture: the Users of the App by Role grid (`FIXTURE.USER.<APP>.<ROLE>`,
 * plus `ADMIN_EVERYWHERE` and `NO_MEMBERSHIP`), their one `PASSWORD` (and `NEW_PASSWORD` for a change), the list
 * the seed writes (`USERS`), their email `DOMAIN` and the Images
 * (`FIXTURE.IMAGE.*`) and the MAIL provider that is on (`FIXTURE.MAIL_PROVIDER`). They exist
 * only in Test databases.
 */
export const FIXTURE = {
  DOMAIN,
  IMAGE,
  MAIL_PROVIDER,
  NEW_PASSWORD,
  PASSWORD,
  USER,
  USERS,
} as const;
