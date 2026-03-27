"use client";

import { authClient } from "@allonfire/auth/client";
import { Button } from "@allonfire/ui/components/button";
import { cn } from "@allonfire/ui/lib/utils";
import { Heart, LogOut, Menu } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { MobileNav } from "./mobile-nav";
import { navItems } from "./nav-links";

export function TopBar({ userName }: { userName?: string | null }) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-border border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link className="flex items-center gap-2" href="/">
          <Heart className="size-5 text-primary" />
          <span className="font-semibold text-lg">Laura</span>
        </Link>

        <nav className="hidden items-center gap-1 lg:flex">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Button
                asChild
                className={cn(isActive && "bg-accent")}
                key={item.href}
                size="sm"
                variant="ghost"
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {item.label}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          {userName && (
            <span className="text-muted-foreground text-sm">{userName}</span>
          )}
          <Button
            onClick={() => authClient.signOut()}
            size="sm"
            variant="ghost"
          >
            <LogOut className="size-4" />
          </Button>
        </div>

        <Button
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          size="icon-sm"
          variant="ghost"
        >
          <Menu className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </header>

      <MobileNav
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
        userName={userName}
      />
    </>
  );
}
