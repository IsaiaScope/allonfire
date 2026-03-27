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
import { Menu } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";
import { MobileNav } from "./mobile-nav";
import { NavLinkContent } from "./nav-link-content";
import { isLinkActive, navSections } from "./nav-links";

export function TopBar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const t = useTranslations("Nav");

  return (
    <>
      <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-border border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <Link className="shrink-0" href="/">
          <Image
            alt="Laura"
            className="block lg:hidden"
            height={32}
            src="/allonfire-laura.svg"
            width={32}
          />
          <Image
            alt="Laura"
            className="hidden lg:block"
            height={32}
            src="/allonfire-laura-horizontal.svg"
            width={108}
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
                <NavigationMenuContent className="backdrop-blur-xl">
                  <ul className="grid w-[280px] p-1.5">
                    {section.links.map((link) => {
                      const active = isLinkActive(pathname, link.href);
                      return (
                        <li key={link.href}>
                          <NavigationMenuLink asChild>
                            <Link
                              className="block select-none rounded-sm px-2.5 py-2 no-underline outline-none transition-colors hover:bg-white/5 hover:text-inherit focus:bg-white/5"
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

        <div className="hidden w-8 lg:block" />
      </header>

      <MobileNav onClose={() => setMobileOpen(false)} open={mobileOpen} />
    </>
  );
}
