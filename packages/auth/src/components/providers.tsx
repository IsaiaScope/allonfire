"use client";

import { TooltipProvider } from "@allonfire/ui/components/tooltip";
import {
  QueryClient,
  type QueryClientConfig,
  QueryClientProvider,
} from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "./sonner";
import { ThemeProvider } from "./theme-provider";

const DEFAULT_QUERY_CONFIG: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount) => failureCount < 3,
    },
  },
};

type ProvidersProps = {
  children: React.ReactNode;
  queryClientConfig?: QueryClientConfig;
};

export function Providers({ children, queryClientConfig }: ProvidersProps) {
  const [queryClient] = useState(
    () => new QueryClient(queryClientConfig ?? DEFAULT_QUERY_CONFIG)
  );

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>{children}</TooltipProvider>
        <Toaster />
      </QueryClientProvider>
    </ThemeProvider>
  );
}
