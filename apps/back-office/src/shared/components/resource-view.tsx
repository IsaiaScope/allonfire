"use client";

import { AOFResourceQueryView } from "@allonfire/ui/features/query/components/aof-resource-query-view";
import type { ComponentProps } from "react";
import { StationNoticeFrame } from "@/features/errors/components/station-notice-frame";
import { SectionLoading } from "@/features/navigation/components/section-loading";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";

const LOADING = <SectionLoading />;

/**
 * The shared resource view for a Back Office page of one resource (an
 * Image's or a User's edit form): the page's loading screen while it is read
 * (its own `loading`, its skeleton, or the Section's waiting room), and the
 * station notice, with its retry, for a refusal that is no 404.
 */
export const ResourceView = <T,>({
  loading = LOADING,
  ...props
}: Omit<
  ComponentProps<typeof AOFResourceQueryView<T>>,
  "actions" | "Frame" | "loading"
> & {
  loading?: ComponentProps<typeof AOFResourceQueryView<T>>["loading"];
}) => (
  <AOFResourceQueryView
    actions={ACTION_DRESSING}
    Frame={StationNoticeFrame}
    loading={loading}
    {...props}
  />
);
