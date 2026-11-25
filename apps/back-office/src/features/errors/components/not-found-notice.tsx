import { AOFNotFoundNotice } from "@allonfire/ui/features/feedback/components/aof-not-found-notice";
import type { ComponentProps } from "react";
import { ACTION_DRESSING } from "@/shared/components/action-dressing";
import { StationNoticeFrame } from "./station-notice-frame";

/** The shared 404 notice in the Back Office's station signage. */
export const NotFoundNotice = ({
  page,
}: Pick<ComponentProps<typeof AOFNotFoundNotice>, "page">) => (
  <AOFNotFoundNotice
    actions={ACTION_DRESSING}
    Frame={StationNoticeFrame}
    page={page}
  />
);
