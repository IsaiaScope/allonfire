import { AOFGetRequestConfig } from "@allonfire/utils/next/i18n/aof-get-request-config";
import { locale } from "next/root-params";
import { routing } from "./routing";

export default AOFGetRequestConfig({
  locale,
  routing,
  translations: async (language) =>
    (await import(`./translations/${language}.json`)).default,
});
