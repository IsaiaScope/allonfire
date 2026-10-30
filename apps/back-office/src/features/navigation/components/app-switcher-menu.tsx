import {
  AOFDropdownMenu,
  AOFDropdownMenuGroup,
  AOFDropdownMenuItem,
  AOFDropdownMenuLabel,
  AOFDropdownMenuTrigger,
} from "@allonfire/ui/components/aof-dropdown-menu";
import {
  AOFSidebarDropdownContent,
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "@allonfire/ui/components/aof-sidebar";
import { IconArrowUpRight, IconCaretUpDown } from "@tabler/icons-react";
import { AppTile } from "@/shared/components/app-tile";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import type { SwitcherApp } from "../constants/apps";
import { CurrentAppMark, switcherButton } from "./current-app-mark";

export type AppSwitcherMenuProps = {
  /** The other Apps the User is allowed into; at least one. */
  apps: SwitcherApp[];
  labels: { apps: string; switchApp: string };
};

/**
 * The App switcher (shadcn's `sidebar-07` team switcher): the App you are in
 * on the button, the other Apps you are allowed into in its menu, each a
 * plain link to that App with its address, and an arrow saying it leaves
 * this one. Opens to the right of the sidebar, below it on a phone.
 */
export const AppSwitcherMenu = ({ apps, labels }: AppSwitcherMenuProps) => (
  <AOFSidebarMenu>
    <AOFSidebarMenuItem>
      <AOFDropdownMenu>
        <AOFDropdownMenuTrigger
          render={
            <AOFSidebarMenuButton
              aria-label={`${labels.switchApp}, ${BACK_OFFICE.NAME}`}
              className={switcherButton()}
              size="lg"
            />
          }
        >
          <CurrentAppMark />
          <IconCaretUpDown aria-hidden className="ml-auto" />
        </AOFDropdownMenuTrigger>
        <AOFSidebarDropdownContent align="start">
          <AOFDropdownMenuGroup>
            <AOFDropdownMenuLabel className="text-muted-foreground text-sm">
              {labels.apps}
            </AOFDropdownMenuLabel>
            {apps.map(({ app, host, href, name }) => (
              <AOFDropdownMenuItem
                className="gap-3 p-2"
                key={app}
                render={<a href={href} />}
              >
                <AppTile app={app} />
                <span className="grid flex-1 leading-tight">
                  <span className="font-medium">{name}</span>
                  <span className="text-muted-foreground text-xs">{host}</span>
                </span>
                <IconArrowUpRight
                  aria-hidden
                  className="ml-2 text-muted-foreground"
                />
              </AOFDropdownMenuItem>
            ))}
          </AOFDropdownMenuGroup>
        </AOFSidebarDropdownContent>
      </AOFDropdownMenu>
    </AOFSidebarMenuItem>
  </AOFSidebarMenu>
);
