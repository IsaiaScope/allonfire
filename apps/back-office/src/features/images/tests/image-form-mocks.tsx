import { ImageMock } from "@allonfire/ui/shared/tests/image-mock";
import { LinkMock } from "@allonfire/ui/shared/tests/link-mock";

/**
 * What an Image form's test mocks, one module standing in for each:
 * `vi.mock(path, () => import("…/image-form-mocks"))`.
 */

/** The App's `Link` (`@/features/i18n/navigation`): a plain `<a>`. */
export const Link = LinkMock;

/** Where the App's router was sent. */
export const replace = vi.fn();

/** The App's router (`@/features/i18n/navigation`): `replace` recorded. */
export const useRouter = () => ({ replace });

/** Core's base navigation (`@allonfire/core/.../aof-base-navigation`), which a shared piece reads: the same `Link` and router. */
export const aofBaseNavigation = { Link, useRouter };

/** ui's `AOFImage` (`@allonfire/ui/shared/components/aof-image`): what it was handed. */
export const AOFImage = ImageMock;
