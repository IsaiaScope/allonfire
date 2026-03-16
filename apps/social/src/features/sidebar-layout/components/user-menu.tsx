"use client";

import { Avatar, AvatarFallback } from "@allonfire/ui/components/avatar";
import { Button } from "@allonfire/ui/components/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@allonfire/ui/components/dropdown-menu";
import { cn } from "@allonfire/ui/lib/utils";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function UserMenu({
  email,
  name,
  collapsed,
}: {
  email: string;
  name: string | null;
  collapsed?: boolean;
}) {
  const router = useRouter();
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
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          className={cn(
            "group flex h-auto cursor-pointer items-center rounded-md text-left text-sidebar-foreground text-sm hover:bg-sidebar-accent/20 hover:text-sidebar-foreground",
            collapsed ? "justify-center p-2" : "w-full gap-3 px-3 py-2"
          )}
          variant="ghost"
        >
          <Avatar className="size-7 shrink-0">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 overflow-hidden">
              <p className="truncate font-medium text-xs">{name ?? email}</p>
              {name && (
                <p className="truncate text-[10px] opacity-70">{email}</p>
              )}
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings className="size-4 text-current" />
          Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4 text-current" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
