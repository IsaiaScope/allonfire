"use client";

import { domMax, LazyMotion } from "framer-motion";
import { createContext } from "react";
import type { SidebarState } from "../constants/sidebar-constants";
import { useSidebar } from "../hooks/use-sidebar";

export type SidebarContextValue = ReturnType<typeof useSidebar>;

export const SidebarContext = createContext<SidebarContextValue | null>(null);

export function SidebarProvider({
  children,
  defaultState,
}: {
  children: React.ReactNode;
  defaultState?: SidebarState;
}) {
  const sidebar = useSidebar(defaultState);

  return (
    <LazyMotion features={domMax}>
      <SidebarContext value={sidebar}>{children}</SidebarContext>
    </LazyMotion>
  );
}
