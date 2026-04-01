"use client";

import { Providers as BaseProviders } from "@allonfire/auth/components/providers";
import type { QueryClientConfig } from "@tanstack/react-query";
import { ApiError } from "@/lib/api-client";

const queryClientConfig: QueryClientConfig = {
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      retry: (failureCount, error) => {
        if (error instanceof ApiError && error.isClientError) {
          return false;
        }
        return failureCount < 3;
      },
    },
  },
};

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <BaseProviders queryClientConfig={queryClientConfig}>
      {children}
    </BaseProviders>
  );
}
