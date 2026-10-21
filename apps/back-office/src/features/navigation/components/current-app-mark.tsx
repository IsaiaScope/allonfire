import { App } from "@allonfire/database/enums";
import { BRAND } from "@allonfire/design/brand/aof-monogram";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { AppTile } from "./app-tile";

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
