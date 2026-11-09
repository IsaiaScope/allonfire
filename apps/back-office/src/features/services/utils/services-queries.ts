import { API } from "@allonfire/api/shared/constants/api";
import type { ServiceType } from "@allonfire/database/enums";
import { queryOptions } from "@tanstack/react-query";
import { parseResponse } from "hono/client";
import type { ApiClient } from "@/features/api/utils/api";
import { QUERY } from "@/shared/constants/query";

/** One Service type and its providers, as the API answers an Admin. */
export const fetchServices = (client: ApiClient, type: ServiceType) =>
  parseResponse(client[API.VERSION.CURRENT].services.$get({ query: { type } }));

type ServiceList = Awaited<ReturnType<typeof fetchServices>>;
type ListedService = ServiceList["services"][number];
export type ListedProvider = ListedService["providers"][number];

/**
 * One type's key, tagged with the body it holds: the page hydrates under it,
 * so a wrong body or type fails to compile, never a skipped hydration.
 */
export const servicesListKey = (type: ServiceType) =>
  queryOptions<ServiceList>({ queryKey: QUERY.SERVICES.LIST(type) }).queryKey;

/**
 * One Service type and its providers. The page reads it on the server
 * (`servicesHydration`, a copy kept up to `SERVICES.CACHE.LIFE`) and the view
 * reads it back under the same key. It is asked again only when an action
 * changed a Service or sent mail (`useRefreshServices`), never on a clock:
 * `"static"`, since a number makes TanStack read the time while the page
 * prerenders, and a time read there blocks a navigation to the page.
 */
export const servicesQuery = (client: ApiClient, type: ServiceType) =>
  queryOptions({
    queryFn: () => fetchServices(client, type),
    queryKey: servicesListKey(type),
    staleTime: "static",
  });
