import type { Role } from "@allonfire/database/enums";
import { type ComponentType, type ReactNode, Suspense } from "react";
import { requireAppSession } from "../utils/session";

/** Asks for the Session, then draws nothing: a visitor the App keeps out is
 *  redirected. */
const AppGate = async ({ minRole }: { minRole: Role | undefined }) => {
  // Bare when the page asks nothing more: the frame asks the same, so the
  // browser keeps one private-cache read for both.
  await (minRole ? requireAppSession({ minRole }) : requireAppSession());
  return null;
};

/**
 * Wraps every signed-in page: the Session check (`requireAppSession`) runs
 * beside the page, behind its own `<Suspense>`, so it never holds the page
 * back. A page without request-time data of its own is in the static shell
 * and paints at once; one with data waits on that data behind `fallback`,
 * the page's own boundary, so a soft navigation between sibling pages has
 * one too (a route group's `loading.tsx` sits above where those diverge).
 * Anyone the App keeps out is redirected to Sign in at request time; the
 * page's static frame may reach them first, its data never (the API checks
 * every request). Checked per page, not in a layout, so each navigation
 * checks again; the browser keeps a passed check a while
 * (`AUTH.SESSION.PAGE_CHECK_STALE_S`). A Section above the App's floor passes
 * its `minRole`: a lower Role is sent Home.
 */
export const withAppSession = <Props extends object>(
  Page: ComponentType<Props>,
  fallback: ReactNode,
  options?: { minRole?: Role | undefined }
) => {
  const SignedInPage = (props: Props) => (
    <>
      <Suspense fallback={null}>
        <AppGate minRole={options?.minRole} />
      </Suspense>
      <Suspense fallback={fallback}>
        <Page {...props} />
      </Suspense>
    </>
  );
  return SignedInPage;
};
