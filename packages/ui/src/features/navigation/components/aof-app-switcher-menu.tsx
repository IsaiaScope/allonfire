import { IconArrowUpRight, IconCaretUpDown } from "@tabler/icons-react";
import {
  AOFDropdownMenu,
  AOFDropdownMenuGroup,
  AOFDropdownMenuItem,
  AOFDropdownMenuLabel,
  AOFDropdownMenuTrigger,
} from "../../../shared/components/aof-dropdown-menu";
import type { AppSwitcherDescriptor } from "../types/app-descriptor";
import type { SwitcherEntry } from "../utils/switcher-apps";
import { AOFAppTile } from "./aof-app-tile";
import { AOFCurrentAppMark, aofSwitcherButton } from "./aof-current-app-mark";
import {
  AOFSidebarDropdownContent,
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "./aof-sidebar";

export type AOFAppSwitcherMenuProps = {
  /** The App you are in: its button, and how it draws each other App. */
  app: AppSwitcherDescriptor;
  /** The other Apps the User is allowed into; at least one. */
  apps: SwitcherEntry[];
  labels: { apps: string; switchApp: string };
};

/**
 * The App switcher (shadcn's `sidebar-07` team switcher): the App you are in
 * on the button, the other Apps you are allowed into in its menu, each a
 * plain link to that App with its address, and an arrow saying it leaves
 * this one. Opens to the right of the sidebar, below it on a phone.
 */
export const AOFAppSwitcherMenu = ({
  app,
  apps,
  labels,
}: AOFAppSwitcherMenuProps) => (
  <AOFSidebarMenu>
    <AOFSidebarMenuItem>
      <AOFDropdownMenu>
        <AOFDropdownMenuTrigger
          render={
            <AOFSidebarMenuButton
              aria-label={`${labels.switchApp}, ${app.name}`}
              className={aofSwitcherButton()}
              size="lg"
            />
          }
        >
          <AOFCurrentAppMark app={app} />
          <IconCaretUpDown aria-hidden className="ml-auto" />
        </AOFDropdownMenuTrigger>
        <AOFSidebarDropdownContent align="start">
          <AOFDropdownMenuGroup>
            <AOFDropdownMenuLabel className="text-muted-foreground text-sm">
              {labels.apps}
            </AOFDropdownMenuLabel>
            {apps.map(({ app: other, host, href, name }) => (
              <AOFDropdownMenuItem
                className="gap-3 p-2"
                key={other}
                render={<a href={href} />}
              >
                <AOFAppTile entry={app.entries[other]} />
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
