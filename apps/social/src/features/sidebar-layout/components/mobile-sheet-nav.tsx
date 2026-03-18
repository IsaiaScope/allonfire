"use client";

import { Button } from "@allonfire/ui/components/button";
import { Separator } from "@allonfire/ui/components/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@allonfire/ui/components/sheet";
import { cn } from "@allonfire/ui/lib/utils";
import { LogOut, Settings } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";
import { useSidebarContext } from "../hooks/use-sidebar-context";
import { SidebarNav } from "./sidebar-nav";
import { UserMenu } from "./user-menu";

type MobileSheetNavProps = {
  role?: string;
  email: string;
  name: string | null;
};

export function MobileSheetNav({ role, email, name }: MobileSheetNavProps) {
  const { isMobileSheetOpen, setMobileSheetOpen } = useSidebarContext();
  const pathname = usePathname();
  const router = useRouter();

  // biome-ignore lint/correctness/useExhaustiveDependencies: close sheet when route changes
  useEffect(() => {
    setMobileSheetOpen(false);
  }, [pathname]);

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/login");
  }

  return (
    <Sheet onOpenChange={setMobileSheetOpen} open={isMobileSheetOpen}>
      <SheetContent className="w-[280px] p-0" side="right">
        <SheetHeader className="items-center p-4">
          <SheetTitle>Social</SheetTitle>
        </SheetHeader>
        <div className="px-4 pb-1">
          <UserMenu email={email} name={name} />
        </div>
        <Separator className="bg-sidebar-border" />
        <div className="flex-1 overflow-y-auto py-2">
          <SidebarNav role={role} />
          <div className="px-2 pt-1">
            <Link
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 font-medium text-sm",
                pathname.startsWith("/settings")
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground/70 hover:bg-accent/50 hover:text-accent-foreground"
              )}
              href="/settings"
            >
              <Settings className="size-4 shrink-0" />
              Settings
            </Link>
          </div>
        </div>
        <Separator className="bg-sidebar-border" />
        <div className="flex items-center justify-end px-4 pt-.5 pb-3">
          <Button onClick={handleSignOut} size="sm" variant="ghost">
            <LogOut className="size-4" />
            Sign out
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
