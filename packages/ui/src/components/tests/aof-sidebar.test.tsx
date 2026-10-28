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

  it("grows a default row to a finger's size on a touch screen", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarMenuButton className="extra">Home</AOFSidebarMenuButton>
      </AOFSidebarProvider>
    );
    expect(html).toContain(
      "pointer-coarse:data-[size=default]:h-(--tap-target)"
    );
    expect(html).toContain("extra");
  });

  it("grows the menu button to a finger's size on a touch screen", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarTrigger aria-label="Toggle menu" />
      </AOFSidebarProvider>
    );
    expect(html).toContain("pointer-coarse:size-(--tap-target)");
  });

  it("draws both menu icons and lets the sidebar's marks pick one, so a fold shows from the first paint", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarTrigger aria-label="Toggle menu" />
      </AOFSidebarProvider>
    );
    expect(html).toContain("tabler-icon-layout-sidebar-left-collapse");
    expect(html).toContain("tabler-icon-layout-sidebar-left-expand");
    expect(html).toContain(
      "group-has-[[data-state=collapsed][data-collapsible]]/sidebar-wrapper:block"
    );
    // Not lit as a menu left open while the HTML still says open.
    expect(html).toContain("aria-expanded:bg-transparent");
    expect(html).not.toContain("aria-expanded:bg-muted");
  });

  it("keeps a row lit while the menu it opens is open", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarMenuButton>Account</AOFSidebarMenuButton>
      </AOFSidebarProvider>
    );
    expect(html).toContain("data-popup-open:bg-sidebar-accent");
    expect(html).toContain("data-popup-open:text-sidebar-accent-foreground");
  });

  // On a touch screen a menu opens once the finger lifts: the row's pressed
  // highlight goes off, then on again as the menu opens, and reads as a
  // second tap unless the change fades.
  it("fades a row's highlight, so pressing then opening reads as one tap", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebarMenuButton>Account</AOFSidebarMenuButton>
      </AOFSidebarProvider>
    );
    expect(html).toContain("background-color");
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
    expect(html).toContain(
      '<div class="group contents" data-collapsible="" data-state="expanded">'
    );
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
});
