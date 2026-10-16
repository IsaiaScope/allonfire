import { AOFRobots } from "@allonfire/core/features/next/metadata/aof-indexed";
import { App } from "@allonfire/database/enums";
import { ACCESS } from "@allonfire/database/features/auth/access/constants/access";
import type { MetadataRoute } from "next";
import { env } from "@/environment/environment";

// Crawling stays open so search engines read the pages' noindex.
const robots = (): MetadataRoute.Robots =>
  AOFRobots({
    indexing: ACCESS.APP_SETTINGS[App.BACK_OFFICE].indexing,
    origin: env.BACK_OFFICE_URL,
  });

export default robots;
