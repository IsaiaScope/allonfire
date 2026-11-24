import { App, type Role } from "@allonfire/database/enums";
import type { ReactNode } from "react";
import { env } from "@/environment/environment";
import { AppFrame } from "@/features/navigation/components/app-frame";
import { ROLE_SEAL } from "@/features/navigation/constants/role-seal";
import { Hanko } from "@/shared/components/hanko";

/** The Role's office stamp beside the User, pressed already: the Sign in
 *  card's late stamp, replayed on every opening, read as a jump. */
const roleSeal = (role: Role) => (
  <Hanko seal={ROLE_SEAL[role]} size="sm" stamp={false} />
);

// The frame is static and holds no data; each page checks the Session
// itself (ADR 0024).
const SignedInLayout = ({ children }: { children: ReactNode }) => (
  <AppFrame addresses={{ [App.LAURA]: env.LAURA_URL }} seal={roleSeal}>
    {children}
  </AppFrame>
);

export default SignedInLayout;
