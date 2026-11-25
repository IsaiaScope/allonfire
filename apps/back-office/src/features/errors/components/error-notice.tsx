"use client";

import {
  AOFErrorNotice,
  type AOFErrorNoticeProps,
} from "@allonfire/ui/features/feedback/components/aof-error-notice";
import { aofErrorPages } from "@allonfire/ui/features/feedback/utils/aof-error-pages";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { StationNoticeFrame } from "./station-notice-frame";

/**
 * The shared error notice in the Back Office's station signage.
 * @internal
 */
export const ErrorNotice = (
  props: Omit<AOFErrorNoticeProps, "actions" | "Frame">
) => (
  <AOFErrorNotice
    actions={ACTION_DRESSING}
    Frame={StationNoticeFrame}
    {...props}
  />
);

/** The error pages Next reads from `error.tsx` and `global-error.tsx`. */
export const { GlobalError, RouteError } = aofErrorPages({
  actions: ACTION_DRESSING,
  Frame: StationNoticeFrame,
});
