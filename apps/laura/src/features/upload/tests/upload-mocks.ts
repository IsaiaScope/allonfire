import { ImageMock } from "@allonfire/ui/shared/tests/image-mock";
import { LinkMock } from "@allonfire/ui/shared/tests/link-mock";

/**
 * What the Upload tests mock, one module standing in for each:
 * `vi.mock(path, () => import("…/upload-mocks"))`.
 */

/** The App's `Link` (`@/features/i18n/navigation`): a plain `<a>`. */
export const Link = LinkMock;

/** Where the App's router was sent. */
export const replace = vi.fn();

/** The App's router (`@/features/i18n/navigation`): `replace` recorded. */
export const useRouter = () => ({ replace });

/** Core's base navigation, which a shared piece reads: the same `Link` and router. */
export const aofBaseNavigation = { Link, useRouter };

/** ui's `AOFImage`: what it was handed. */
export const AOFImage = ImageMock;
