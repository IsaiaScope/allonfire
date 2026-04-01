"use client";

import { Button } from "@allonfire/ui/components/button";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { cn } from "@allonfire/ui/lib/utils";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAutoHideNavbar } from "../hooks/use-auto-hide-navbar";
import DesktopNav from "./desktop-nav";
import { MobileNav } from "./mobile-nav";

type TopBarProps = {
  name: string | null;
  email: string;
};

export function TopBar({ name, email }: TopBarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [headerHovered, setHeaderHovered] = useState(false);
  const t = useTranslations("Nav");
  const isGallery = pathname === "/" || pathname === "/favorites";
  const navbarVisible = useAutoHideNavbar(
    isGallery,
    mobileOpen || headerHovered
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-40 flex h-15 items-center justify-between border-sidebar-border border-b bg-sidebar px-4 py-3 lg:z-30 lg:h-16 lg:border-border lg:bg-background/95 lg:py-0 lg:backdrop-blur lg:supports-[backdrop-filter]:bg-background/60",
          isGallery && [
            "fixed inset-x-0 border-border transition-transform duration-300 ease-in-out",
            !navbarVisible && "-translate-y-full",
          ]
        )}
        onPointerEnter={() => setHeaderHovered(true)}
        onPointerLeave={() => setHeaderHovered(false)}
        style={
          isGallery
            ? {
                backdropFilter: "blur(4px)",
                WebkitBackdropFilter: "blur(4px)",
                backgroundColor:
                  "color-mix(in srgb, var(--sidebar) 80%, transparent)",
              }
            : undefined
        }
      >
        <Link href="/">
          <Image
            alt="Laura"
            className="block lg:hidden"
            height={36}
            priority
            src="/allonfire-laura-horizontal.svg"
            width={120}
          />
          <Image
            alt="Laura"
            className="hidden lg:block"
            height={46}
            priority
            src="/allonfire-laura-horizontal.svg"
            width={156}
          />
        </Link>

        <DesktopNav pathname={pathname} />

        <Button
          className="lg:hidden"
          onClick={() => setMobileOpen(true)}
          size="icon-sm"
          variant="ghost"
        >
          <Menu className="size-5" />
          <span className="sr-only">{t("openMenu")}</span>
        </Button>

        <div className="hidden lg:block">
          <ThemeToggle />
        </div>
      </header>

      <MobileNav
        email={email}
        name={name}
        onClose={() => setMobileOpen(false)}
        open={mobileOpen}
      />
    </>
  );
}
