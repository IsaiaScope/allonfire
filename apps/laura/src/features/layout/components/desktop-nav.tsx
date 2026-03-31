"use client";

import {
  NavigationMenu,
  NavigationMenuContent,
  NavigationMenuItem,
  NavigationMenuLink,
  NavigationMenuList,
  NavigationMenuTrigger,
} from "@allonfire/ui/components/navigation-menu";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { NavLinkContent } from "./nav-link-content";
import { isLinkActive, navSections } from "./nav-links";

type DesktopNavProps = {
  pathname: string;
};

export default function DesktopNav({ pathname }: DesktopNavProps) {
  const t = useTranslations("Nav");
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted) {
    return (
      <nav className="hidden items-center gap-1 lg:flex">
        {navSections.map((section) => (
          <div
            className="inline-flex h-9 items-center justify-center rounded-md bg-background px-4 py-2 font-medium text-sm"
            key={section.labelKey}
          >
            <section.icon className="mr-1.5 size-4" />
            {t(section.labelKey)}
            <ChevronDown aria-hidden className="relative top-px ml-1 size-3" />
          </div>
        ))}
      </nav>
    );
  }

  return (
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
  );
}
