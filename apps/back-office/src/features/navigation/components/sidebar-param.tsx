"use client";

import { useAOFSidebar } from "@allonfire/ui/components/aof-sidebar";
import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { NAVIGATION, sidebarParam } from "../constants/navigation";

/**
 * Keeps the sidebar and the address in step: on arrival the address opens or
 * collapses it, then each toggle writes the address. A leaf of its own, in
 * its own `<Suspense>`: reading the address renders on the client only, and
 * the frame around it stays in the static shell.
 * ponytail: the address leads only on arrival; Back after a toggle does not
 * move the sidebar, since toggles replace their history entry.
 */
export const SidebarParam = () => {
  const [param, setParam] = useQueryState(
    NAVIGATION.PARAM.SIDEBAR,
    sidebarParam
  );
  const { open, setOpen } = useAOFSidebar();
  const arrived = useRef<boolean>(false);
  // The last value the address holds, so the second effect needs no `param`.
  const written = useRef(param);

  useEffect(() => {
    if (arrived.current) {
      return;
    }
    arrived.current = true;
    setOpen(param);
  }, [param, setOpen]);

  useEffect(() => {
    if (arrived.current && open !== written.current) {
      written.current = open;
      setParam(open);
    }
  }, [open, setParam]);

  return null;
};
