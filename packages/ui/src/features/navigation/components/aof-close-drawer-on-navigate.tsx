"use client";

import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { useEffect } from "react";
import { useAOFSidebar } from "./aof-sidebar";

/**
 * Closes the phone's drawer once a Section is reached: shadcn's sidebar
 * closes it only from its trigger, so a tapped link would leave it covering
 * the page.
 */
export const AOFCloseDrawerOnNavigate = () => {
  const pathname = aofBaseNavigation.usePathname();
  const { setOpenMobile } = useAOFSidebar();
  useEffect(() => {
    if (pathname) {
      setOpenMobile(false);
    }
  }, [pathname, setOpenMobile]);
  return null;
};
