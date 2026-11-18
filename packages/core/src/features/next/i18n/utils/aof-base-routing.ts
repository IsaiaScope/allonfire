import { I18N } from "../../../i18n/constants/locales";
import { AOFDefineRouting } from "./aof-define-routing";

/**
 * The routing of an App that speaks the base languages. Alone in its file on
 * purpose: an App's `next.config` reads its routing in plain Node, where
 * next-intl's navigation (`aof-base-navigation`) cannot load.
 */
export const aofBaseRouting = AOFDefineRouting(I18N.BASE_LANGUAGES);
