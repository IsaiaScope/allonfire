"use client";

import { useIsDesktop } from "@allonfire/hooks/use-breakpoint";
import { Button } from "@allonfire/ui/components/button";
import { ScrollArea } from "@allonfire/ui/components/scroll-area";
import { Separator } from "@allonfire/ui/components/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/ui/components/tooltip";
import { cn } from "@allonfire/ui/lib/utils";
import { m } from "framer-motion";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { COLLAPSED_WIDTH } from "../constants/sidebar-constants";
import { useSidebarContext } from "../hooks/use-sidebar-context";
import { SidebarLogo, SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type DesktopSidebarProps = {
  role?: string;
  email: string;
  name: string | null;
};

export function DesktopSidebar({ role, email, name }: DesktopSidebarProps) {
  const {
    isCollapsed,
    width,
    toggle,
    onCollapseAnimationComplete,
    isCollapseAnimationDone,
  } = useSidebarContext();
  const isDesktop = useIsDesktop();

  // Tablet (md–lg): always collapsed, no toggle
  const effectiveCollapsed = isDesktop ? isCollapsed : true;
  const showTooltips = isCollapseAnimationDone && effectiveCollapsed;
  const effectiveWidth = effectiveCollapsed ? COLLAPSED_WIDTH : width;

  return (
    <m.aside
      animate={{ width: effectiveWidth }}
      className="hidden flex-col overflow-hidden border-sidebar-border border-r bg-sidebar max-lg:max-w-[60px] md:flex"
      initial={false}
      onAnimationComplete={() => {
        if (effectiveCollapsed) {
          onCollapseAnimationComplete();
        }
      }}
      transition={{ duration: 0.2, ease: "easeOut" }}
    >
      <div
        className={cn(
          "flex items-center",
          effectiveCollapsed
            ? "flex-col gap-2 py-3"
            : "justify-between px-3 py-2"
        )}
      >
        {showTooltips ? (
          <Tooltip>
            <TooltipTrigger
              render={
                <span>
                  <SidebarLogo collapsed={effectiveCollapsed} />
                </span>
              }
            />
            <TooltipContent
              className="py-1.5 [&>div:last-child]:hidden"
              side="right"
              sideOffset={8}
            >
              Social
            </TooltipContent>
          </Tooltip>
        ) : (
          <SidebarLogo collapsed={effectiveCollapsed} />
        )}
        <Tooltip>
          <TooltipTrigger
            render={
              <Button
                aria-label={
                  effectiveCollapsed ? "Expand sidebar" : "Collapse sidebar"
                }
                className="hidden lg:inline-flex"
                onClick={toggle}
                size="icon-sm"
                variant="ghost"
              >
                {effectiveCollapsed ? (
                  <PanelLeftOpen className="size-4.5" />
                ) : (
                  <PanelLeftClose className="size-4.5" />
                )}
              </Button>
            }
          />
          <TooltipContent
            className="py-1.5 [&>div:last-child]:hidden"
            side="right"
            sideOffset={8}
          >
            {effectiveCollapsed ? "Expand" : "Collapse"}
          </TooltipContent>
        </Tooltip>
      </div>

      <Separator className="bg-sidebar-border" />

      <ScrollArea className="flex-1 py-4">
        <SidebarNav collapsed={effectiveCollapsed} role={role} />
      </ScrollArea>

      <Separator className="bg-sidebar-border" />

      <div className="p-3">
        <UserMenu collapsed={effectiveCollapsed} email={email} name={name} />
      </div>
    </m.aside>
  );
}
