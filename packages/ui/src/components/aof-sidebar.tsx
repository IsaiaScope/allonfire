"use client";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@allonfire/shadcn/components/sidebar";
import type { ComponentProps } from "react";

/**
 * The desktop main menu: shadcn's sidebar, collapsing to its icons. On a
 * phone shadcn would open it as a drawer; the App's tab bar replaces it
 * there, so nothing opens it. Its state lives in the App (a URL param), not
 * in shadcn's cookie, which nothing reads.
 */
export const AOFSidebar = ({
  collapsible = "icon",
  ...props
}: ComponentProps<typeof Sidebar>) => (
  <Sidebar collapsible={collapsible} {...props} />
);

// ponytail: the other parts are shadcn's under AOF names, nothing added yet.
export const AOFSidebarContent = SidebarContent;
export const AOFSidebarFooter = SidebarFooter;
export const AOFSidebarHeader = SidebarHeader;
export const AOFSidebarInset = SidebarInset;
export const AOFSidebarMenu = SidebarMenu;
export const AOFSidebarMenuButton = SidebarMenuButton;
export const AOFSidebarMenuItem = SidebarMenuItem;
export const AOFSidebarProvider = SidebarProvider;
export const AOFSidebarTrigger = SidebarTrigger;
export const useAOFSidebar = useSidebar;
