import { bindRenderInUi } from "@allonfire/ui/shared/tests/render-in-ui";
import EN from "../../features/i18n/translations/en.json" with { type: "json" };

/** `renderInUi` over the Back Office's own words (`messages` swaps them). */
export const renderInApp = bindRenderInUi(EN);
