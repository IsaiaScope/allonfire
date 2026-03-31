import type { MetadataRoute } from "next";
import { baseUrl, indexableRoutes } from "@/lib/seo";

function getPriority(route: string) {
  if (route === "/") {
    return 1.0;
  }
  if (route === "/games") {
    return 0.8;
  }
  return 0.6;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return indexableRoutes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === "/" ? "daily" : "weekly",
    priority: getPriority(route),
    alternates: {
      languages: {
        it: `${baseUrl}${route}`,
        en: `${baseUrl}/en${route === "/" ? "" : route}`,
      },
    },
  }));
}
