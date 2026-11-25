import { getLocale } from "next-intl/server";
import { env } from "@/environment/environment";
import { layoutMetadata } from "@/features/metadata/utils/page-information";

/** The layout's `generateMetadata`: the head in the request's language, on the App's own address. */
export const layoutHead = async () =>
  layoutMetadata({ locale: await getLocale(), origin: env.LAURA_URL });
