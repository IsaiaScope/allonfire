// @module-tag integration
import {
  AOFSidebarMenuSub,
  AOFSidebarMenuSubButton,
  AOFSidebarMenuSubItem,
  AOFSidebarProvider,
} from "@allonfire/ui/features/navigation/components/aof-sidebar";
import { computedValue } from "@allonfire/ui/shared/tests/computed-style";
import { IconTrophy } from "@tabler/icons-react";
import { renderInApp } from "@/shared/tests/render-in-app";
import { sectionRow } from "../section-row";

const LABEL = "Leaderboard";

/** A page of a Section, drawn as the sidebar draws it. */
const pageRow = async (current: boolean) => {
  const screen = await renderInApp({
    children: (
      <AOFSidebarProvider>
        <AOFSidebarMenuSub>
          <AOFSidebarMenuSubItem>
            <AOFSidebarMenuSubButton
              className={sectionRow({ current })}
              isActive={current}
              render={<a href="#top" />}
            >
              <IconTrophy aria-hidden />
              <span>{LABEL}</span>
            </AOFSidebarMenuSubButton>
          </AOFSidebarMenuSubItem>
        </AOFSidebarMenuSub>
      </AOFSidebarProvider>
    ),
  });
  const row = screen.getByRole("link", { name: LABEL }).element();
  return { icon: row.querySelector("svg"), row };
};

describe("sectionRow on a Section's page", () => {
  // shadcn paints a sub-menu row's icon in the sidebar accent's text colour,
  // which is dark in the light scheme: on the ink pill it vanished.
  it("draws the page you are on with its icon in the pill's text colour", async () => {
    const { icon, row } = await pageRow(true);
    expect(icon).not.toBeNull();
    const pill = getComputedStyle(row);
    expect(pill.backgroundColor).toBe(
      computedValue("background-color", "var(--ink)")
    );
    expect(getComputedStyle(icon ?? row).color).toBe(
      computedValue("color", "var(--ink-foreground)")
    );
  });
});
