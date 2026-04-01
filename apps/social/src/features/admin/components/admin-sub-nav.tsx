"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Bot, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const adminLinks = [
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/providers", label: "AI Providers", icon: Bot },
];

export function AdminSubNav() {
  const pathname = usePathname();

  return (
    <nav className="flex shrink-0 flex-row gap-1 overflow-x-auto [scrollbar-width:none] md:w-48 md:flex-col [&::-webkit-scrollbar]:hidden">
      {adminLinks.map((link) => {
        const isActive = pathname.startsWith(link.href);

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
