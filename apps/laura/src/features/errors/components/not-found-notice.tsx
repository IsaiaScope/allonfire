import { AOFNotFoundNotice } from "@allonfire/ui/features/feedback/components/aof-not-found-notice";
import type { ComponentProps } from "react";
import { ACTION_DRESSING } from "@/shared/constants/action-dressing";
import { OceanNoticeFrame } from "./ocean-notice-frame";

/** The shared 404 notice in Laura's Ocean Design. */
export const NotFoundNotice = ({
  page,
}: Pick<ComponentProps<typeof AOFNotFoundNotice>, "page">) => (
  <AOFNotFoundNotice
    actions={ACTION_DRESSING}
    Frame={OceanNoticeFrame}
    page={page}
  />
);
