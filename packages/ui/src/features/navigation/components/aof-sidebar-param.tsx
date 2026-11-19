"use client";

import { useQueryState } from "nuqs";
import { useEffect, useRef } from "react";
import { NAVIGATION, sidebarParam } from "../constants/navigation";
import { useAOFSidebar } from "./aof-sidebar";

/**
 * Keeps the sidebar and the address in step: on arrival the address opens or
 * collapses it, then each toggle writes the address. A leaf of its own, in
 * its own `<Suspense>`: reading the address renders on the client only, and
 * the frame around it stays in the static shell.
 * The frame outlives a client navigation but a link to a bare address drops
 * the param, so after arrival the sidebar leads: an address that disagrees
 * with it is written back, and a refresh keeps the menu as it is.
 * ponytail: the address leads only on arrival; Back after a toggle does not
 * move the sidebar, since toggles replace their history entry.
 */
export const AOFSidebarParam = () => {
  const [param, setParam] = useQueryState(
    NAVIGATION.PARAM.SIDEBAR,
    sidebarParam
  );
  const { open, setOpen } = useAOFSidebar();
  // True once the sidebar has taken the address's value on arrival.
  const arrived = useRef<boolean>(false);

  useEffect(() => {
    if (!arrived.current) {
      arrived.current = open === param;
      if (!arrived.current) {
        setOpen(param);
      }
      return;
    }
    if (open !== param) {
      setParam(open);
    }
  }, [open, param, setOpen, setParam]);

  return null;
};
