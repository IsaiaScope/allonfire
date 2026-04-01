"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@allonfire/ui/components/tooltip";
import { cn } from "@allonfire/ui/lib/utils";
import { AnimatePresence, m } from "framer-motion";
import {
  Compass,
  LayoutDashboard,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { useSidebarContext } from "../hooks/use-sidebar-context";

export const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/publish", label: "Publish", icon: Send },
  { href: "/admin", label: "Admin Panel", icon: ShieldCheck, adminOnly: true },
];

type SidebarNavProps = {
  role?: string;
  collapsed?: boolean;
};

export function SidebarNav({ role, collapsed }: SidebarNavProps) {
  const pathname = usePathname();
  const { isCollapseAnimationDone } = useSidebarContext();

  // Controls when the active indicator participates in Framer Motion layout animations.
  // Disabled synchronously when collapse/expand starts (avoids sweep during width animation),
  // re-enabled one frame AFTER animation completes (lets tooltip DOM restructuring settle first).
  const [layoutIdReady, setLayoutIdReady] = useState(true);
  if (!isCollapseAnimationDone && layoutIdReady) {
    setLayoutIdReady(false);
  }
  useEffect(() => {
    if (isCollapseAnimationDone) {
      const id = requestAnimationFrame(() => setLayoutIdReady(true));
      return () => cancelAnimationFrame(id);
    }
  }, [isCollapseAnimationDone]);

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "ADMIN"
  );

  return (
    <nav className="flex flex-col gap-1 px-2">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        const showTooltip = isCollapseAnimationDone && collapsed;
        const link = (
          <Link
            className={cn(
              "group relative flex items-center rounded-md font-medium text-sm transition-colors duration-150",
              collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
              isActive
                ? "text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-accent-foreground"
            )}
            href={item.href}
          >
            {isActive && (
              <m.div
                className="absolute inset-0 rounded-md bg-sidebar-primary"
                layoutId="sidebar-active"
                transition={
                  layoutIdReady
                    ? { type: "spring", bounce: 0.15, duration: 0.4 }
                    : { layout: { duration: 0 } }
                }
              />
            )}
            <item.icon
              className={cn(
                "relative z-10 shrink-0 transition-transform duration-150 group-hover:scale-110",
                collapsed ? "size-5" : "size-4"
              )}
            />
            <AnimatePresence initial={false}>
              {!collapsed && (
                <m.span
                  animate={{ opacity: 1, width: "auto" }}
                  className="relative z-10 overflow-hidden whitespace-nowrap"
                  exit={{ opacity: 0, width: 0 }}
                  initial={{ opacity: 0, width: 0 }}
                  key="label"
                  transition={{ duration: 0.15 }}
                >
                  {item.label}
                </m.span>
              )}
            </AnimatePresence>
          </Link>
        );

        if (showTooltip) {
          return (
            <Tooltip key={item.href}>
              <TooltipTrigger render={link} />
              <TooltipContent
                className="py-1.5 [&>div:last-child]:hidden"
                side="right"
                sideOffset={8}
              >
                {item.label}
              </TooltipContent>
            </Tooltip>
          );
        }

        return <span key={item.href}>{link}</span>;
      })}
    </nav>
  );
}

export function SidebarLogo({ collapsed }: { collapsed?: boolean }) {
  return (
    <Link
      className="relative flex shrink-0 items-center justify-center"
      href="/"
    >
      <m.div
        animate={{
          width: collapsed ? 36 : 156,
          height: collapsed ? 36 : 46,
        }}
        className="relative"
        initial={false}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Image
          alt="AllOnFire Social"
          className={cn(
            "absolute rounded-md transition-opacity duration-200",
            collapsed ? "opacity-100" : "opacity-0"
          )}
          height={36}
          src="/allonfire-social.svg"
          width={36}
        />
        <Image
          alt="AllOnFire Social"
          className={cn(
            "absolute rounded-md transition-opacity duration-200",
            collapsed ? "opacity-0" : "opacity-100"
          )}
          height={46}
          priority
          src="/allonfire-social-horizontal.svg"
          width={156}
        />
      </m.div>
    </Link>
  );
}
