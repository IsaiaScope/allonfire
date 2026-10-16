import type { Metadata } from "next";
import { getLocale, getTranslations } from "next-intl/server";
import { pageOpenGraph } from "@/features/metadata/utils/page-open-graph";
import type { Section } from "../constants/sections";

/** A Section page's metadata: its menu label as the title, its own link preview. */
export const sectionMetadata = async (section: Section): Promise<Metadata> => {
  const [t, locale] = await Promise.all([
    getTranslations("Navigation"),
    getLocale(),
  ]);
  return {
    openGraph: pageOpenGraph(section.path, locale),
    title: t(section.label),
  };
};
