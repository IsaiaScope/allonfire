"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AOFGetQueryClient } from "../query/aof-get-query-client";
import type { AOFQueryErrors } from "../query/aof-query-errors";

/**
 * The page's query client. `errors` says how a failure is told (a toast):
 * a function, so the App passes it from a client component of its own.
 */
export const AOFQueryClientProvider = ({
  children,
  errors,
  staleTime,
}: {
  children: ReactNode;
  errors?: AOFQueryErrors | undefined;
  staleTime?: number | undefined;
}) => (
  <QueryClientProvider client={AOFGetQueryClient({ errors, staleTime })}>
    {children}
  </QueryClientProvider>
);
