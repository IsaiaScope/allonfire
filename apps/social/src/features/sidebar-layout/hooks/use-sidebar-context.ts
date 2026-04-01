"use client";

import { use } from "react";
import { SidebarContext } from "../providers/sidebar-provider";

export function useSidebarContext() {
  const context = use(SidebarContext);
  if (!context) {
    throw new Error("useSidebarContext must be used within SidebarProvider");
  }
  return context;
}
