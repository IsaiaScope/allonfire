"use client";

import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { lazy, type ReactNode, Suspense } from "react";
import { env } from "@/env";
import { getQueryClient } from "@/lib/get-query-client";

// Loaded only in development: production bundles never download it.
const ReactQueryDevtools = lazy(() =>
  import("@tanstack/react-query-devtools").then((module) => ({
    default: module.ReactQueryDevtools,
  }))
);

export const Providers = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={getQueryClient()}>
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      disableTransitionOnChange
      enableSystem
    >
      <NuqsAdapter>{children}</NuqsAdapter>
    </ThemeProvider>
    {env.NODE_ENV === "development" && (
      <Suspense fallback={null}>
        <ReactQueryDevtools />
      </Suspense>
    )}
  </QueryClientProvider>
);
