import { type DehydratedState, HydrationBoundary } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AOFHydrateMissing } from "./aof-hydrate-missing";

const leaveToView = () => undefined;

/**
 * A view handed the data a private-cache read kept (ADR 0028), already filled.
 * A read the API refused is left to the view, which asks again and shows the
 * error, or nothing for a 403: the read never throws past here. A Server
 * Component; `hydration` is the read, dehydrated from `AOFGetQueryClient`.
 *
 * `onlyMissing` is for a feed with several loaded pages: it hydrates only the
 * queries the browser does not hold yet (`AOFHydrateMissing`), so a page that
 * re-renders after an action never puts a feed back to its first page.
 */
export const AOFHydratedBoundary = async ({
  children,
  hydration,
  onlyMissing = false,
}: {
  children: ReactNode;
  hydration: () => Promise<DehydratedState>;
  onlyMissing?: boolean;
}) => {
  const state = await hydration().catch(leaveToView);
  return onlyMissing ? (
    <AOFHydrateMissing state={state}>{children}</AOFHydrateMissing>
  ) : (
    <HydrationBoundary state={state}>{children}</HydrationBoundary>
  );
};
