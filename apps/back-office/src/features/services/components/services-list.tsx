import { HydrationBoundary } from "@tanstack/react-query";
import { servicesHydration } from "../utils/services-hydration";
import { ServicesView, type ServicesViewProps } from "./services-view";

const leaveToView = () => undefined;

/**
 * One Service type's page body: its providers read from the API as the
 * visitor (an Admin; the API refuses anyone else) through the private cache
 * (`servicesHydration`, kept for that type's own time, `SERVICES.CACHE`),
 * handed to the view already filled. Every Services action clears the cache
 * (`updateTag`) and the view (`useRefreshServices`). A read the API refused
 * is left to the view, which asks again and shows the error.
 */
export const ServiceProviders = async (props: ServicesViewProps) => (
  <HydrationBoundary
    state={await servicesHydration(props.type).catch(leaveToView)}
  >
    <ServicesView {...props} />
  </HydrationBoundary>
);
