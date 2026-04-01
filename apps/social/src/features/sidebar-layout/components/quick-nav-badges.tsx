"use client";

import { Button } from "@allonfire/ui/components/button";
import { Settings } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems } from "./sidebar-nav";

type QuickNavBadgesProps = {
  role?: string;
};

export function QuickNavBadges({ role }: QuickNavBadgesProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "ADMIN"
  );

  return (
    <div className="flex gap-2 overflow-x-auto overscroll-x-contain border-sidebar-border border-b px-4 py-2.5 [scrollbar-width:none] md:hidden [&::-webkit-scrollbar]:hidden">
      {visibleItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Button
            asChild
            className="shrink-0 gap-1.5 rounded-full px-3.5 py-1.5 text-xs"
            key={item.href}
            size="sm"
            variant={isActive ? "default" : "ghost"}
          >
            <Link href={item.href}>
              <item.icon className="size-3.5" />
              {item.label}
            </Link>
          </Button>
        );
      })}
      <Button
        asChild
        className="shrink-0 gap-1.5 rounded-full px-3.5 py-1.5 text-xs"
        size="sm"
        variant={pathname.startsWith("/settings") ? "default" : "ghost"}
      >
        <Link href="/settings">
          <Settings className="size-3.5" />
          Settings
        </Link>
      </Button>
    </div>
  );
}
