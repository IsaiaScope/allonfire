/**
 * The App's navigation as a test renders it. For the App's own module:
 * `vi.mock("@/features/i18n/navigation", () => import("@allonfire/ui/shared/tests/navigation-mock"))`.
 * For a shared piece, which reads core's base navigation instead:
 * `vi.mock("@allonfire/core/features/next/i18n/utils/aof-base-navigation", () => import("@allonfire/ui/shared/tests/navigation-mock"))`.
 */
import { LinkMock } from "./link-mock";

/** The address `usePathname` reports; a test moves it to navigate. */
export const navigationAt = { pathname: "/" };

export const Link = LinkMock;
export const usePathname = () => navigationAt.pathname;
export const aofBaseNavigation = { Link, usePathname };
