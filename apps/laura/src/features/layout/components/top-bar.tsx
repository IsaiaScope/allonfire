"use client";

import { Button } from "@allonfire/ui/components/button";
import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@allonfire/ui/components/navigation-menu";
import { ThemeToggle } from "@allonfire/ui/components/theme-toggle";
import { cn } from "@allonfire/ui/lib/utils";
import { Menu } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { useAutoHideNavbar } from "../hooks/use-auto-hide-navbar";
import { MobileNav } from "./mobile-nav";
import { NavLinkContent } from "./nav-link-content";
import { isLinkActive, navSections } from "./nav-links";

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

        <NavigationMenu className="hidden lg:flex" viewport={false}>
          <NavigationMenuList>
            {navSections.map((section) => (
              <NavigationMenuItem key={section.labelKey}>
                <NavigationMenuTrigger>
                  <section.icon className="mr-1.5 size-4" />
                  {t(section.labelKey)}
                </NavigationMenuTrigger>
                <NavigationMenuContent>
                  <ul className="grid max-h-[50vh] w-[280px] overflow-y-auto p-0.5">
                    {section.links.map((link) => {
                      const active = isLinkActive(pathname, link.href);
                      return (
                        <li key={link.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              className="block select-none rounded-sm px-2 py-1.5 no-underline outline-none transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground"
                              href={link.href}
                            >
                              <NavLinkContent
                                active={active}
                                description={t(link.descriptionKey)}
                                label={t(link.labelKey)}
                                link={link}
                              />
                            </Link>
                          </NavigationMenuLink>
                        </li>
                      );
                    })}
                  </ul>
                </NavigationMenuContent>
              </NavigationMenuItem>
            ))}
          </NavigationMenuList>
        </NavigationMenu>

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
