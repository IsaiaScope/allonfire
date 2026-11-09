"use client";

import { NuqsAdapter } from "nuqs/adapters/next/app";
import type { ComponentProps } from "react";

export const AOFNuqsAdapter = (props: ComponentProps<typeof NuqsAdapter>) => (
  <NuqsAdapter {...props} />
);
