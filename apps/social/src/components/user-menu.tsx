"use client";

import { Avatar, AvatarFallback } from "@allonfire/ui/components/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@allonfire/ui/components/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";

export function UserMenu({
  email,
  name,
}: {
  email: string;
  name: string | null;
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
        <button
          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          type="button"
        >
          <Avatar className="size-7">
            <AvatarFallback className="bg-primary/15 text-primary text-xs">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 overflow-hidden">
            <p className="truncate font-medium text-xs">{name ?? email}</p>
            {name && (
              <p className="truncate text-[10px] text-sidebar-foreground/50">
                {email}
              </p>
            )}
          </div>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56" side="top">
        <DropdownMenuItem disabled>
          <User className="size-4" />
          Profile
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={handleSignOut}>
          <LogOut className="size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
