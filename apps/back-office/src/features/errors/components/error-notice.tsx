"use client";

import {
  AOFErrorNotice,
  type AOFErrorNoticeProps,
} from "@allonfire/ui/features/feedback/components/aof-error-notice";
import { ACTION_DRESSING } from "@/shared/constants/action-dressing";
import { StationNoticeFrame } from "./station-notice-frame";

export type { AOFErrorBoundaryProps as ErrorBoundaryProps } from "@allonfire/ui/features/feedback/components/aof-error-notice";

/** The shared error notice in the Back Office's station signage. */
export const ErrorNotice = (
  props: Omit<AOFErrorNoticeProps, "actions" | "Frame">
) => (
  <AOFErrorNotice
    actions={ACTION_DRESSING}
    Frame={StationNoticeFrame}
    {...props}
  />
);
