"use client";

import { Button } from "@allonfire/ui/components/button";
import { Menu } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useSidebarContext } from "../hooks/use-sidebar-context";

export function MobileTopBar() {
  const { openSheet } = useSidebarContext();

  return (
    <header className="sticky top-0 z-40 flex items-center justify-between border-sidebar-border border-b bg-sidebar px-4 py-3 md:hidden">
      <Link href="/">
        <Image
          alt="AllOnFire Social"
          height={36}
          priority
          src="/allonfire-social-horizontal.svg"
          width={120}
        />
      </Link>
      <Button
        aria-label="Open menu"
        onClick={openSheet}
        size="icon-sm"
        variant="ghost"
      >
        <Menu className="size-5" />
      </Button>
    </header>
  );
}
