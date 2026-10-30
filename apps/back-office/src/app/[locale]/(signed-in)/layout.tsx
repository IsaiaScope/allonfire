import { signOut } from "@allonfire/auth/features/next/actions/sign-out";
import { useLocale } from "next-intl";
import { type ReactNode, Suspense } from "react";
import {
  Account,
  AccountPlaceholder,
} from "@/features/navigation/components/account";
import { AppFrame } from "@/features/navigation/components/app-frame";
import {
  AppSwitcher,
  CurrentApp,
} from "@/features/navigation/components/app-switcher";
import { NAVIGATION } from "@/features/navigation/constants/navigation";

// The frame is static and holds no data; each page checks the Session
// itself, and the App switcher and the account menu read it behind their
// own Suspense (ADR 0024).
const SignedInLayout = ({ children }: { children: ReactNode }) => {
  // Server Actions cannot read the route's locale yet; the form binds it.
  const signOutHere = signOut.bind(null, useLocale());
  return (
    <>
      <form action={signOutHere} id={NAVIGATION.FORM.SIGN_OUT} />
      <AppFrame
        account={
          <Suspense fallback={<AccountPlaceholder />}>
            <Account />
          </Suspense>
        }
        switcher={
          <Suspense fallback={<CurrentApp />}>
            <AppSwitcher />
          </Suspense>
        }
      >
        {children}
      </AppFrame>
    </>
  );
};

export default SignedInLayout;
