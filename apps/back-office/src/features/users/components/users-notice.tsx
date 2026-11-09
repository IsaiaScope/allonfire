"use client";

import { IconArrowBackUp, IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import {
  ListNotice,
  type ListNoticeProps,
  type ListNoticeSpec,
} from "@/shared/components/list-notice";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { USERS } from "../constants/users";

/** Each notice where the rows stand: its signage, its action's pictogram and
 *  kanji, and where its words live. */
const NOTICE = {
  empty: {
    action: "empty.clear",
    icon: IconRefresh,
    kanji: USERS.RESET_KANJI,
    signage: USERS.SIGNAGE.EMPTY,
  },
  error: {
    action: "error.retry",
    icon: IconRefresh,
    kanji: ACTION_KANJI.RETRY,
    signage: ERROR_SIGNAGE.ERROR,
  },
  pastEnd: {
    action: "pastEnd.last",
    icon: IconArrowBackUp,
    kanji: ACTION_KANJI.BACK,
    signage: USERS.SIGNAGE.PAST_END,
  },
} as const satisfies Record<string, ListNoticeSpec>;

export type UsersNoticeProps = ListNoticeProps & {
  kind: keyof typeof NOTICE;
};

/**
 * What the Users list shows where its rows stand when it has none to show,
 * as the 404 does on a page, boxed as the rows: nobody
 * matches the search (clear it), the address asks for a page past the last
 * one (`?page=9` with 2 pages: go to the last), or the rows could not be
 * loaded (ask again). The pager stays below.
 */
export const UsersNotice = ({ kind, ...props }: UsersNoticeProps) => {
  const t = useTranslations("Users");
  return <ListNotice kind={kind} spec={NOTICE[kind]} t={t} {...props} />;
};
