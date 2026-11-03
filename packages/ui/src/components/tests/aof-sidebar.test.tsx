// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarGroup,
  AOFSidebarInset,
  AOFSidebarMenuButton,
  AOFSidebarProvider,
  AOFSidebarRail,
  AOFSidebarTrigger,
} from "../aof-sidebar";

/** shadcn's marks on the wrapper, open as the server draws it. */
const WRAPPER = /<div [^>]*data-collapsible="" data-state="expanded">/;

describe("AOFSidebar", () => {
  it("opens expanded and collapses to icons", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar label="Menu">
          <AOFSidebarContent>Sections</AOFSidebarContent>
        </AOFSidebar>
        <AOFSidebarInset>Page</AOFSidebarInset>
      </AOFSidebarProvider>
    );
    expect(html).toContain('data-state="expanded"');
    expect(html).toContain('data-collapsible=""');
    expect(html).toContain("Sections");
    expect(html).toContain("<main");
  });

  it("groups its menu and draws the rail that toggles it", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar label="Menu">
          <AOFSidebarGroup>Sections</AOFSidebarGroup>
          <AOFSidebarRail />
        </AOFSidebar>
      </AOFSidebarProvider>
    );
    expect(html).toContain('data-slot="sidebar-group"');
    expect(html).toContain('data-slot="sidebar-rail"');
  });

  it("draws a row with its label and the caller's class", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarMenuButton className="caller-class">
          Home
        </AOFSidebarMenuButton>
      </AOFSidebarProvider>
    );
    expect(html).toContain("Home");
    expect(html).toContain("caller-class");
  });

  it("draws both menu icons, so a fold shows from the first paint", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarTrigger aria-label="Toggle menu" />
      </AOFSidebarProvider>
    );
    expect(html).toContain("tabler-icon-layout-sidebar-left-collapse");
    expect(html).toContain("tabler-icon-layout-sidebar-left-expand");
    expect(html).toContain('aria-label="Toggle menu"');
  });

  it("draws the sidebar collapsed from the first paint when the address says so", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar
          collapsedBy={{ param: "sidebar", value: "false" }}
          label="Menu"
        >
          Sections
        </AOFSidebar>
      </AOFSidebarProvider>
    );
    // shadcn's marks on a wrapper, open as the server draws it, then the
    // script that reads the address before the first paint.
    expect(html).toMatch(WRAPPER);
    expect(html).toContain("</div><script>");
    expect(html).toContain('.get("sidebar") === "false"');
    expect(html).toContain('dataset.collapsible = "icon"');
  });

  it("adds no wrapper or script without an address to follow", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar label="Menu">Sections</AOFSidebar>
      </AOFSidebarProvider>
    );
    expect(html).not.toContain("<script");
  });

  it("widens the sidebar and its rail by the left inset", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar label="Menu">Sections</AOFSidebar>
      </AOFSidebarProvider>
    );
    expect(html).toContain(
      "--sidebar-width:calc(16rem + env(safe-area-inset-left, 0px))"
    );
    expect(html).toContain(
      "--sidebar-width-icon:calc(3.375rem + env(safe-area-inset-left, 0px))"
    );
  });
});
