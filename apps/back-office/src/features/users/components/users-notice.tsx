"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import {
  IconArrowBackUp,
  IconRefresh,
  type TablerIcon,
} from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useCallback } from "react";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import {
  StationNotice,
  type StationNoticeProps,
  type StationSignage,
} from "@/shared/components/station-notice";
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
    kanji: ERROR_SIGNAGE.ERROR.RETRY_KANJI,
    signage: ERROR_SIGNAGE.ERROR,
  },
  pastEnd: {
    action: "pastEnd.last",
    icon: IconArrowBackUp,
    kanji: USERS.CANCEL_KANJI,
    signage: USERS.SIGNAGE.PAST_END,
  },
} as const satisfies Record<
  string,
  { action: string; icon: TablerIcon; kanji: string; signage: StationSignage }
>;

export type UsersNoticeProps = Omit<
  StationNoticeProps,
  "action" | "description" | "heading" | "scope" | "signage"
> & {
  kind: keyof typeof NOTICE;
  /** What its one button does: clear the search, go to the last page, or
   *  ask again. */
  onAction: () => void;
};

/**
 * What the Users list shows where its rows stand when it has none to show,
 * as the 404 does on a page, boxed as the rows: nobody
 * matches the search (clear it), the address asks for a page past the last
 * one (`?page=9` with 2 pages: go to the last), or the rows could not be
 * loaded (ask again). The pager stays below.
 */
export const UsersNotice = ({ kind, onAction, ...props }: UsersNoticeProps) => {
  const t = useTranslations("Users");
  const { action, icon: Icon, kanji, signage } = NOTICE[kind];
  // A bare `onAction` would receive the click event as its first argument.
  const act = useCallback(() => onAction(), [onAction]);
  return (
    <StationNotice
      action={
        <AOFButton
          className={kanjiAction()}
          onClick={act}
          size="field"
          type="button"
        >
          <ActionKanji kanji={kanji} />
          <Icon aria-hidden />
          {t(action)}
        </AOFButton>
      }
      description={t(`${kind}.description`)}
      // No entrance: the notice stands where rows were, often for a moment
      // (a search typed on), so the stamp and words are there at once. Any
      // other notice prop (children, `entrance`) passes on.
      entrance={false}
      heading={t(`${kind}.title`)}
      scope="part"
      signage={signage}
      {...props}
    />
  );
};
