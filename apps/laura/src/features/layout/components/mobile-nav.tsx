"use client";

import { authClient } from "@allonfire/auth/client";
import { Button } from "@allonfire/ui/components/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@allonfire/ui/components/sheet";
import { cn } from "@allonfire/ui/lib/utils";
import { Heart, LogOut } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { navItems } from "./nav-links";

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  userName?: string | null;
};

export function MobileNav({ open, onClose, userName }: MobileNavProps) {
  const pathname = usePathname();
  const t = useTranslations("Nav");

  return (
    <Sheet onOpenChange={(v) => !v && onClose()} open={open}>
      <SheetContent className="w-72" side="right">
        <SheetHeader className="px-4 pb-4">
          <SheetTitle className="flex items-center gap-2">
            <Heart className="size-5 text-primary" />
            {t("appName")}
          </SheetTitle>
        </SheetHeader>

        <nav className="flex flex-col gap-1 px-2">
          {navItems.map((item) => {
            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname.startsWith(item.href);

            return (
              <Button
                asChild
                className={cn("justify-start", isActive && "bg-accent")}
                key={item.href}
                onClick={onClose}
                variant="ghost"
              >
                <Link href={item.href}>
                  <item.icon className="size-4" />
                  {t(item.labelKey)}
                </Link>
              </Button>
            );
          })}
        </nav>

        <div className="mt-auto border-border border-t px-4 pt-4">
          {userName && (
            <p className="mb-2 text-muted-foreground text-sm">{userName}</p>
          )}
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
