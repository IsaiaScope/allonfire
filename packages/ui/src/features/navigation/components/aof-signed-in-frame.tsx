import type { Role } from "@allonfire/database/enums";
import { type ComponentProps, type ReactNode, Suspense } from "react";
import type { AppDescriptor } from "../types/app-descriptor";
import { AOFAccount, AOFAccountPlaceholder } from "./aof-account";
import { AOFAppFrame, type AOFAppFrameProps } from "./aof-app-frame";
import { AOFAppSwitcher, AOFCurrentApp } from "./aof-app-switcher";
import { AOFSignOutForm } from "./aof-sign-out-form";

export type AOFSignedInFrameProps = Omit<
  AOFAppFrameProps,
  "account" | "app" | "switcher"
> & {
  /**
   * The other Apps' addresses (the App's own variables); see `AOFAppSwitcher`.
   * An App that links to no other passes none: its top button is only its own
   * mark, with no menu and no Session read.
   */
  addresses?: ComponentProps<typeof AOFAppSwitcher>["addresses"] | undefined;
  app: Pick<AppDescriptor, "app" | "entries" | "name" | "sections">;
  /** The App's own mark for a Role, beside the User; none, the Role's name alone. */
  seal?: (role: Role) => ReactNode;
};

/**
 * Every signed-in layout's body (ADR 0024): the sign out form, which the
 * account menu submits from outside its popup, and `AOFAppFrame` with the
 * account menu and the App switcher, each behind its own `Suspense`. The
 * frame stays static and in the shell; the two Session reads cannot hold it
 * back. An App passes its Design's frame props and its addresses, and
 * wires none of it.
 */
export const AOFSignedInFrame = ({
  addresses,
  app,
  seal,
  ...frame
}: AOFSignedInFrameProps) => (
  <>
    <AOFSignOutForm />
    <AOFAppFrame
      {...frame}
      account={
        <Suspense fallback={<AOFAccountPlaceholder />}>
          <AOFAccount app={app} {...(seal ? { seal } : {})} />
        </Suspense>
      }
      app={app}
      switcher={
        addresses ? (
          <Suspense fallback={<AOFCurrentApp app={app} />}>
            <AOFAppSwitcher addresses={addresses} app={app} />
          </Suspense>
        ) : (
          <AOFCurrentApp app={app} />
        )
      }
    />
  </>
);
