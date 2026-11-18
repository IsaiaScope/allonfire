import type { Language } from "@allonfire/core/features/i18n/constants/locales";
import { renderInUi } from "@allonfire/ui/shared/tests/render-in-ui";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import EN from "../../features/i18n/translations/en.json" with { type: "json" };

/** `renderInUi` over the Back Office's own words (`messages` swaps them). */
export const renderInApp = ({
  messages = EN,
  ...options
}: {
  children: ReactNode;
  language?: Language;
  messages?: typeof EN;
  onUrlUpdate?: (event: UrlUpdateEvent) => void;
  search?: string;
}) => renderInUi({ messages, ...options });
