import type { MetadataRoute } from "next";
import { baseUrl, getRobotsRules } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  const { allow, disallow } = getRobotsRules();
  return {
    rules: {
      userAgent: "*",
      allow,
      disallow,
    },
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
