"use client";

import { IconRefresh } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { ERROR_SIGNAGE } from "@/features/errors/constants/error-signage";
import {
  ListNotice,
  type ListNoticeProps,
  type ListNoticeSpec,
} from "@/shared/components/list-notice";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { IMAGES } from "../constants/images";

/** Each notice where the rows stand: its signage, its action's pictogram and
 *  kanji, and where its words live. */
const NOTICE = {
  empty: {
    action: "empty.clear",
    icon: IconRefresh,
    kanji: IMAGES.RESET_KANJI,
    signage: IMAGES.SIGNAGE.EMPTY,
  },
  error: {
    action: "error.retry",
    icon: IconRefresh,
    kanji: ACTION_KANJI.RETRY,
    signage: ERROR_SIGNAGE.ERROR,
  },
} as const satisfies Record<string, ListNoticeSpec>;

export type ImagesNoticeProps = ListNoticeProps & {
  kind: keyof typeof NOTICE;
};

/**
 * What the Images list shows where its rows stand when it has none to show:
 * no Image matches the filter (clear it), or the rows could not be loaded
 * (ask again). A page past the last one never shows: it steps back.
 */
export const ImagesNotice = ({ kind, ...props }: ImagesNoticeProps) => {
  const t = useTranslations("Images");
  return <ListNotice kind={kind} spec={NOTICE[kind]} t={t} {...props} />;
};
