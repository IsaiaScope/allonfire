import { App, type Role } from "@allonfire/database/enums";
import {
  AOFAccount,
  AOFAccountPlaceholder,
} from "@allonfire/ui/features/navigation/components/aof-account";
import {
  AOFAppSwitcher,
  AOFCurrentApp,
} from "@allonfire/ui/features/navigation/components/aof-app-switcher";
import { AOFSignOutForm } from "@allonfire/ui/features/navigation/components/aof-sign-out-form";
import { type ReactNode, Suspense } from "react";
import { env } from "@/environment/environment";
import { AppFrame } from "@/features/navigation/components/app-frame";
import { ROLE_SEAL } from "@/features/navigation/constants/role-seal";
import { Hanko } from "@/shared/components/hanko";
import { BACK_OFFICE } from "@/shared/constants/back-office";

/** The Role's office stamp beside the User, pressed already: the Sign in
 *  card's late stamp, replayed on every opening, read as a jump. */
const roleSeal = (role: Role) => (
  <Hanko seal={ROLE_SEAL[role]} size="sm" stamp={false} />
);

// The frame is static and holds no data; each page checks the Session
// itself, and the App switcher and the account menu read it behind their
// own Suspense (ADR 0024).
const SignedInLayout = ({ children }: { children: ReactNode }) => (
  <>
    <AOFSignOutForm />
    <AppFrame
      account={
        <Suspense fallback={<AOFAccountPlaceholder />}>
          <AOFAccount app={BACK_OFFICE} seal={roleSeal} />
        </Suspense>
      }
      switcher={
        <Suspense fallback={<AOFCurrentApp app={BACK_OFFICE} />}>
          <AOFAppSwitcher
            addresses={{ [App.LAURA]: env.LAURA_URL }}
            app={BACK_OFFICE}
          />
        </Suspense>
      }
    >
      {children}
    </AppFrame>
  </>
);

export default SignedInLayout;
