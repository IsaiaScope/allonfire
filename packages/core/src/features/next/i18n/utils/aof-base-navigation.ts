import { aofBaseRouting } from "./aof-base-routing";
import { AOFCreateNavigation } from "./aof-create-navigation";

/**
 * The navigation built from the base routing (`Link`, `redirect`,
 * `usePathname`, `useRouter`, `getPathname`, `languageLinks`). A shared piece
 * imports this, never an App's own `@/features/i18n/navigation`; an App
 * routing other languages keeps its own and passes what it needs.
 */
export const aofBaseNavigation = AOFCreateNavigation(aofBaseRouting);
