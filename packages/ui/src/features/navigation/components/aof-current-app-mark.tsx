import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { cva } from "class-variance-authority";
import type { AppDescriptor } from "../types/app-descriptor";
import { AOFAppTile } from "./aof-app-tile";

/**
 * The switcher's button box: 52px, the hover hugging the 48px tile 2px
 * around it. The menu's button and the mark drawn while it loads share it,
 * so nothing moves when the menu arrives.
 */
export const aofSwitcherButton = cva("h-13 gap-3 p-0.5 pr-1.5");

export type AOFCurrentAppMarkProps = {
  app: Pick<AppDescriptor, "app" | "entries" | "name">;
};

/**
 * The App you are in, as the switcher's button shows it: its tile, then its
 * name over the brand it belongs to.
 */
export const AOFCurrentAppMark = ({ app }: AOFCurrentAppMarkProps) => (
  <>
    <AOFAppTile entry={app.entries[app.app]} size="lg" />
    <span className="grid flex-1 text-left text-base leading-tight">
      <span className="truncate font-medium">{app.name}</span>
      <span className="truncate text-muted-foreground text-sm">
        {BRAND.NAME}
      </span>
    </span>
  </>
);
