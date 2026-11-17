import { USER } from "@allonfire/auth/features/users/constants/users";
import { useListView } from "@/shared/hooks/use-list-view";
import { USERS } from "../constants/users";
import { usersParams } from "../constants/users-params";

/**
 * The Users list's Sort and View, read from and written to its address
 * (`useListView`): called by its table state, for TanStack, and by its Filter
 * panel, for the Sort and View tabs, both writing the same params.
 */
export const useUsersView = () =>
  useListView({
    codecs: { hide: USERS.HIDE, sort: USER.SORT },
    hideable: USERS.HIDEABLE,
    parsers: {
      hide: usersParams[USER.PARAM.HIDE],
      page: usersParams[USER.PARAM.PAGE],
      sort: usersParams[USER.PARAM.SORT],
    },
    sortable: USERS.SORTABLE,
  });
