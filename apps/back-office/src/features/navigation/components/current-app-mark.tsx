import { App } from "@allonfire/database/enums";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { cva } from "class-variance-authority";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { AppTile } from "./app-tile";

/**
 * The switcher's button box: 52px, the hover hugging the 48px tile 2px
 * around it. The menu's button and the mark drawn while it loads share it,
 * so nothing moves when the menu arrives.
 */
export const switcherButton = cva("h-13 gap-3 p-0.5 pr-1.5");

/**
 * The App you are in, as the switcher's button shows it: its tile, then its
 * name over the brand it belongs to.
 */
export const CurrentAppMark = () => (
  <>
    <AppTile app={App.BACK_OFFICE} size="lg" />
    <span className="grid flex-1 text-left text-base leading-tight">
      <span className="truncate font-medium">{BACK_OFFICE.NAME}</span>
      <span className="truncate text-muted-foreground text-sm">
        {BRAND.NAME}
      </span>
    </span>
  </>
);
