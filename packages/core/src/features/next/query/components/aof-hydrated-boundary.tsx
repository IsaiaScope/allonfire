import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";

const leaveToView = () => undefined;

/**
 * A view handed the data a private-cache read kept (ADR 0028), already filled.
 * A read the API refused is left to the view, which asks again and shows the
 * error, or nothing for a 403: the read never throws past here. A Server
 * Component; `hydration` is the read, dehydrated from `AOFGetQueryClient`.
 */
export const AOFHydratedBoundary = async ({
  children,
  hydration,
}: {
  children: ReactNode;
  hydration: () => Promise<DehydratedState>;
}) => (
  <HydrationBoundary state={await hydration().catch(leaveToView)}>
    {children}
  </HydrationBoundary>
);
