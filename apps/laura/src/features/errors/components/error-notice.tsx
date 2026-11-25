"use client";

import {
  AOFErrorNotice,
  type AOFErrorNoticeProps,
} from "@allonfire/ui/features/feedback/components/aof-error-notice";
import { aofErrorPages } from "@allonfire/ui/features/feedback/utils/aof-error-pages";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { OceanNoticeFrame } from "./ocean-notice-frame";

/**
 * The shared error notice in Laura's Ocean Design.
 * @internal
 */
export const ErrorNotice = (
  props: Omit<AOFErrorNoticeProps, "actions" | "Frame">
) => (
  <AOFErrorNotice
    actions={ACTION_DRESSING}
    Frame={OceanNoticeFrame}
    {...props}
  />
);

/** The error pages Next reads from `error.tsx` and `global-error.tsx`. */
export const { GlobalError, RouteError } = aofErrorPages({
  actions: ACTION_DRESSING,
  Frame: OceanNoticeFrame,
});
