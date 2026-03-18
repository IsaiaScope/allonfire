"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Bell, Settings, TrendingUp } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const settingsLinks = [
  { href: "/settings/general", label: "General", icon: Settings },
  {
    href: "/settings/notifications",
    label: "Notifications",
    icon: Bell,
    disabled: true,
  },
  {
    href: "/settings/usage",
    label: "Usage & Billing",
    icon: TrendingUp,
    disabled: true,
  },
];

export function SettingsSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto [scrollbar-width:none] md:w-48 md:flex-col [&::-webkit-scrollbar]:hidden">
      {settingsLinks.map((link) => {
        const isActive = pathname === link.href;

        if (link.disabled) {
          return (
            <span
              className="flex shrink-0 cursor-not-allowed items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 font-medium text-muted-foreground/50 text-sm"
              key={link.href}
            >
              <link.icon className="size-4" />
              {link.label}
            </span>
          );
        }

        return (
          <Link
            className={cn(
              "flex shrink-0 items-center gap-2 whitespace-nowrap rounded-md px-3 py-2 font-medium text-sm transition-colors",
              isActive
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
            )}
            href={link.href}
            key={link.href}
          >
            <link.icon className="size-4" />
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
