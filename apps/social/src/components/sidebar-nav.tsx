"use client";

import { cn } from "@allonfire/ui/lib/utils";
import {
  Calendar,
  Compass,
  FileText,
  LayoutDashboard,
  Settings,
  Sparkles,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/discover", label: "Discover", icon: Compass },
  { href: "/generate", label: "Generate", icon: Sparkles },
  { href: "/drafts", label: "Drafts", icon: FileText },
  { href: "/schedule", label: "Schedule", icon: Calendar },
  { href: "/users", label: "Users", icon: Users, adminOnly: true },
  { href: "/settings", label: "Settings", icon: Settings },
];

type SidebarNavProps = {
  role?: string;
};

export function SidebarNav({ role }: SidebarNavProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || role === "ADMIN"
  );

  return (
    <nav className="flex flex-col gap-1 px-2">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm transition-colors",
              isActive
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            href={item.href}
            key={item.href}
          >
            <item.icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function SidebarLogo() {
  return (
    <Link className="flex items-center gap-2.5 px-4 py-1" href="/">
      <Image
        alt="AllOnFire"
        className="rounded-md"
        height={32}
        src="/allonfire.svg"
        width={32}
      />
      <div>
        <p className="font-bold text-sm tracking-tight">AllOnFire</p>
        <p className="text-[10px] text-sidebar-foreground/50 uppercase tracking-widest">
          Social Engine
        </p>
      </div>
    </Link>
  );
}
