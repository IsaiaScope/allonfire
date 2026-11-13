"use client";

import { AOFButton } from "@allonfire/ui/shared/components/aof-button";
import type { TablerIcon } from "@tabler/icons-react";
import { useCallback } from "react";
import { ActionKanji, kanjiAction } from "@/shared/components/brush-kanji";
import {
  StationNotice,
  type StationNoticeProps,
  type StationSignage,
} from "@/shared/components/station-notice";

/** A notice where a list's rows stand: its signage, and its action's pictogram
 *  and kanji. Each list keeps one per kind, with where its words live. */
export type ListNoticeSpec<Action extends string = string> = {
  action: Action;
  icon: TablerIcon;
  kanji: string;
  signage: StationSignage;
};

/** What a list's notice takes of `StationNotice`'s props: the rest is the list's. */
export type ListNoticeProps = Omit<
  StationNoticeProps,
  "action" | "description" | "heading" | "scope" | "signage"
> & {
  /** What its one button does: clear the filter, go to the last page, or ask again. */
  onAction: () => void;
};

/**
 * What a list shows where its rows stand when it has none to show, boxed as
 * the rows: a notice with one button. The list gives the `kind` it shows, its
 * `spec`, and its words `t`: `<kind>.title`, `<kind>.description` and the
 * button's own key.
 */
export const ListNotice = <Kind extends string, Action extends string>({
  kind,
  onAction,
  spec: { action, icon: Icon, kanji, signage },
  t,
  ...props
}: ListNoticeProps & {
  kind: Kind;
  spec: ListNoticeSpec<Action>;
  t: (key: Action | `${Kind}.description` | `${Kind}.title`) => string;
}) => {
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
