import { hasSectionRole } from "@allonfire/auth/features/next/utils/has-section-role";
import { requireAppSession } from "@allonfire/auth/features/next/utils/session";
import type { ReactNode } from "react";
import type { AppSection } from "../types/app-descriptor";

/**
 * A Section's row, drawn only for a Role that reaches its `minRole`: auth's
 * own rule (`hasSectionRole`, for the App auth serves), the one the page's
 * guard and the proxy apply. Reads the page check's own Session
 * (`requireAppSession`, one per request, so no extra API call), which is why
 * the frame draws it inside its own `<Suspense fallback={null}>`: the rest of
 * the frame stays in the static shell, and a gated row appears after it
 * paints. It never throws: whoever the check keeps out is redirected by the
 * page's own, and sees no row. Hiding the row is courtesy; the proxy, the
 * page and the API refuse again.
 */
export const AOFRoleGatedSection = async ({
  children,
  section,
}: {
  children: ReactNode;
  section: AppSection;
}) => {
  try {
    const session = await requireAppSession();
    return hasSectionRole(session, section.minRole) ? children : null;
  } catch {
    return null;
  }
};
