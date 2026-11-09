import { readSessionCookie } from "@allonfire/auth/features/next/utils/session-cookie";
import { AOFGetQueryClient } from "@allonfire/core/features/next/query/utils/aof-get-query-client";
import type { ServiceType } from "@allonfire/database/enums";
import { dehydrate } from "@tanstack/react-query";
import { cacheLife, cacheTag } from "next/cache";
import { sessionApi } from "@/features/api/utils/server-api";
import { SERVICES, serviceTag } from "../constants/services";
import { fetchServices, servicesListKey } from "./services-queries";

/**
 * One Service type and its providers as the visitor's Session reads them,
 * ready for the view's TanStack cache under the key it reads back. Kept in
 * their browser only (`"use cache: private"`, ADR 0028) so a link can
 * prefetch the page, under the tags and the lifetime of that type; dehydrated
 * inside that cache, since TanStack stamps the time into what it dehydrates.
 * A kept copy can be minutes old and mail sent elsewhere moves the usage: the
 * view asks again while it is on screen, and a provider save carries its
 * `version`, which the API refuses on an older copy. A refusal is thrown,
 * never kept.
 */
export const servicesHydration = async (type: ServiceType) => {
  "use cache: private";
  cacheTag(SERVICES.CACHE.TAG, serviceTag(type));
  cacheLife(SERVICES.CACHE.LIFE[type]);
  const queryClient = AOFGetQueryClient();
  queryClient.setQueryData(
    servicesListKey(type),
    await fetchServices(sessionApi(await readSessionCookie()), type)
  );
  return dehydrate(queryClient);
};
