"use client";

import { useAOFSidebar } from "@allonfire/ui/components/aof-sidebar";
import { useEffect } from "react";
import { usePathname } from "@/features/i18n/navigation";

/**
 * Closes the phone's drawer once a Section is reached: shadcn's sidebar
 * closes it only from its trigger, so a tapped link would leave it covering
 * the page.
 */
export const CloseDrawerOnNavigate = () => {
  const pathname = usePathname();
  const { setOpenMobile } = useAOFSidebar();
  useEffect(() => {
    if (pathname) {
      setOpenMobile(false);
    }
  }, [pathname, setOpenMobile]);
  return null;
};
