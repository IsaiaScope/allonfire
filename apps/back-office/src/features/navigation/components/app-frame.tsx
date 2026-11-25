import {
  AOFSignedInFrame,
  type AOFSignedInFrameProps,
} from "@allonfire/ui/features/navigation/components/aof-signed-in-frame";
import { cva } from "class-variance-authority";
import type { ReactNode } from "react";
import { Torii } from "@/shared/components/torii";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { sectionRow } from "../utils/section-row";
import { FrameBreadcrumb } from "./frame-breadcrumb";
import { HeaderKanji } from "./header-kanji";
import { SidebarKanji } from "./sidebar-kanji";

/** The Japan Design's line under both headers. */
const lineRule = cva("border-line/50 border-b-2");

/**
 * The shared frame in the Back Office's Japan Design: its Sections, the
 * tactile bar on the row you are on, the brushed kanji behind the sidebar
 * and the header, the line under both, and the torii at the header's end.
 */
export const AppFrame = ({
  addresses,
  children,
  seal,
}: Pick<AOFSignedInFrameProps, "addresses" | "seal"> & {
  children: ReactNode;
}) => (
  <AOFSignedInFrame
    addresses={addresses}
    app={BACK_OFFICE}
    breadcrumb={<FrameBreadcrumb />}
    classNames={{ frameHeader: lineRule(), sidebarHeader: lineRule() }}
    rowClassName={{
      current: sectionRow({ current: true }),
      idle: sectionRow({ current: false }),
    }}
    slots={{
      headerEnd: <Torii className="ml-auto h-10.5 w-12.5" />,
      headerWall: <HeaderKanji />,
      sidebarWall: <SidebarKanji />,
    }}
    {...(seal ? { seal } : {})}
  >
    {children}
  </AOFSignedInFrame>
);
