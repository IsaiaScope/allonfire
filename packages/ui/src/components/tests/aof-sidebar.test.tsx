// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFSidebar,
  AOFSidebarContent,
  AOFSidebarInset,
  AOFSidebarProvider,
} from "../aof-sidebar";

describe("AOFSidebar", () => {
  it("opens expanded and collapses to icons", () => {
    const html = renderToStaticMarkup(
      <AOFSidebarProvider>
        <AOFSidebar>
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
});
