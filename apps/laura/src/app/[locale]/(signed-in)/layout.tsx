import { AOFSignedInFrame } from "@allonfire/ui/features/navigation/components/aof-signed-in-frame";
import type { ReactNode } from "react";
import { FrameBreadcrumb } from "@/features/navigation/components/frame-breadcrumb";
import { sectionRow } from "@/features/navigation/utils/section-row";
import { LauraMark } from "@/shared/components/laura-mark";
import { LAURA } from "@/shared/constants/laura";

// The frame is static and holds no data; each page checks the Session
// itself (ADR 0024). Laura draws no Role stamp: the account shows the Role as
// a word, and no App switcher: it links to no other App.
const SignedInLayout = ({ children }: { children: ReactNode }) => (
  <AOFSignedInFrame
    app={LAURA}
    breadcrumb={<FrameBreadcrumb />}
    collapsible="icon"
    rowClassName={{
      current: sectionRow({ current: true }),
      idle: sectionRow({ current: false }),
    }}
    slots={{ headerEnd: <LauraMark /> }}
    variant="floating"
  >
    {children}
  </AOFSignedInFrame>
);

export default SignedInLayout;
