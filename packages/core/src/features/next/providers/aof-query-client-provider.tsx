"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { AOFGetQueryClient } from "../query/aof-get-query-client";

export const AOFQueryClientProvider = ({
  children,
  staleTime,
}: {
  children: ReactNode;
  staleTime?: number | undefined;
}) => (
  <QueryClientProvider client={AOFGetQueryClient({ staleTime })}>
    {children}
  </QueryClientProvider>
);
