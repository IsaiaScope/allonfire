import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS } from "../constants/users";

/** One User's page, under the Users Section. */
export const userHref = (id: string) =>
  `${BACK_OFFICE.PAGE.USERS}/${encodeURIComponent(id)}`;

/** The Add a User page. */
export const newUserHref = () => `${BACK_OFFICE.PAGE.USERS}${USERS.PATH.NEW}`;
