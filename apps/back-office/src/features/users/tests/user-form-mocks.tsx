import { ImageMock } from "@/shared/tests/image-mock";
import { LinkMock } from "@/shared/tests/link-mock";

/**
 * What a User form's test mocks, one module standing in for each:
 * `vi.mock(path, () => import("…/user-form-mocks"))`.
 */

/** The App's `Link` (`@/features/i18n/navigation`): a plain `<a>`. */
export const Link = LinkMock;

/** Where the App's router was sent. */
export const replace = vi.fn();

/** The App's router (`@/features/i18n/navigation`): `replace` recorded. */
export const useRouter = () => ({ replace });

/** ui's `AOFImage` (`@allonfire/ui/components/aof-image`): what it was handed. */
export const AOFImage = ImageMock;
