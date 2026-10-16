import { type ComponentType, type ReactNode, Suspense } from "react";
import { requireAppSession } from "../utils/session";

/** Renders the page only once the Session check lets the visitor in. */
const Gated = async <Props extends object>({
  page: Page,
  props,
}: {
  page: ComponentType<Props>;
  props: Props;
}) => {
  await requireAppSession();
  return <Page {...props} />;
};

/**
 * Wraps every signed-in page: the Session check (`requireAppSession`) runs
 * first, and the page renders only once it lets the visitor in; anyone else
 * is redirected to Sign in before any of the page reaches the browser. The
 * wait shows `fallback` inside the page's own `<Suspense>`, so every
 * navigation has its boundary, a soft one between sibling pages included (a
 * route group's `loading.tsx` sits above where those diverge). Checked per
 * page, not in a layout, so each navigation checks again.
 */
export const withAppSession = <Props extends object>(
  Page: ComponentType<Props>,
  fallback: ReactNode
) => {
  const SignedInPage = (props: Props) => (
    <Suspense fallback={fallback}>
      <Gated page={Page} props={props} />
    </Suspense>
  );
  return SignedInPage;
};
