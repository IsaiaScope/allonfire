"use client";

import { authClient } from "@allonfire/auth/client";
import { Avatar, AvatarFallback } from "@allonfire/ui/components/avatar";
import { Button } from "@allonfire/ui/components/button";
import { Separator } from "@allonfire/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@allonfire/ui/components/sheet";
import { cn } from "@allonfire/ui/lib/utils";
import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useIsAdmin, useIsViewer } from "@/components/user-role-provider";
import { Link, usePathname } from "@/i18n/navigation";
import { isLinkActive, navSections } from "./nav-links";

type MobileNavProps = {
  open: boolean;
  onClose: () => void;
  name: string | null;
  email: string;
};

export function MobileNav({ open, onClose, name, email }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const t = useTranslations("Nav");
  const isViewer = useIsViewer();
  const isAdmin = useIsAdmin();

  const initials = name
    ? name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
    : (email?.[0]?.toUpperCase() ?? "?");

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Sheet onOpenChange={(v) => !v && onClose()} open={open}>
      <SheetContent className="flex w-[280px] flex-col p-0" side="right">
        <SheetHeader className="items-center p-4">
          <SheetTitle>{t("appName")}</SheetTitle>
        </SheetHeader>
        <div className="flex items-center gap-3 px-4 pb-3">
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-xs">{name ?? email}</p>
            {name && <p className="truncate text-[10px] opacity-70">{email}</p>}
          </div>
        </div>
        <Separator className="bg-sidebar-border" />

        <nav className="flex-1 overflow-y-auto py-2">
          {navSections.map((section, idx) => (
            <div key={section.labelKey}>
              {idx > 0 && <Separator className="my-1 bg-sidebar-border" />}
              <p className="px-4 pt-2 pb-1 font-medium text-muted-foreground text-xs uppercase tracking-wider">
                {t(section.labelKey)}
              </p>
              <div className="px-2">
                {section.links.map((link) => {
                  const active = isLinkActive(pathname, link.href);
                  const restricted =
                    (isViewer && link.viewerRestricted) ||
                    (link.adminOnly && !isAdmin);

                  if (restricted) {
                    return (
                      <div
                        className="flex cursor-not-allowed items-center gap-3 rounded-md px-3 py-2 font-medium text-sm opacity-50"
                        key={link.href}
                      >
                        <link.icon className="size-4 shrink-0" />
                        {t(link.labelKey)}
                      </div>
                    );
                  }

                  return (
                    <Link
                      className={cn(
                        "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm",
                        active
                          ? "bg-sidebar-primary text-sidebar-primary-foreground"
                          : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-accent-foreground"
                      )}
                      href={link.href}
                      key={link.href}
                      onClick={onClose}
                    >
                      <link.icon className="size-4 shrink-0" />
                      {t(link.labelKey)}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <Separator className="bg-sidebar-border" />
        <div className="flex items-center justify-end px-4 pt-0.5 pb-3">
          <Button onClick={handleSignOut} size="sm" variant="ghost">
            <LogOut className="size-4" />
            {t("signOut")}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
