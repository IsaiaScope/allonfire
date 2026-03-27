"use client";

import { authClient } from "@allonfire/auth/client";
import { Button } from "@allonfire/ui/components/button";
import { Separator } from "@allonfire/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@allonfire/ui/components/sheet";
import { LogOut } from "lucide-react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { NavLinkContent } from "./nav-link-content";
import { isLinkActive, navSections } from "./nav-links";

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
};

export function MobileNav({ open, onClose }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <Sheet onOpenChange={(v) => !v && onClose()} open={open}>
      <SheetContent className="flex w-72 flex-col" side="right">
        <SheetHeader className="px-4 pb-2">
          <SheetTitle>
            <Image
              alt="Laura"
              height={32}
              src="/allonfire-laura-horizontal.svg"
              width={108}
            />
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-1 flex-col gap-1 px-2">
          {navSections.map((section, idx) => (
            <div key={section.labelKey}>
              {idx > 0 && <Separator className="my-2" />}
              <p className="px-3 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {t(section.labelKey)}
              </p>
              {section.links.map((link) => {
                const active = isLinkActive(pathname, link.href);
                return (
                  <Link
                    className="block rounded-sm px-2.5 py-2 transition-colors hover:bg-white/5 hover:text-inherit"
                    href={link.href}
                    key={link.href}
                    onClick={onClose}
                  >
                    <NavLinkContent
                      active={active}
                      description={t(link.descriptionKey)}
                      label={t(link.labelKey)}
                      link={link}
                    />
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="border-border border-t px-4 pt-4">
          <Button
            className="w-full justify-start"
            onClick={() => authClient.signOut()}
            variant="ghost"
          >
            <LogOut className="size-4" />
            {t("signOut")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
