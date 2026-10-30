// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import { AOFDropdownMenu, AOFDropdownMenuTrigger } from "../aof-dropdown-menu";

describe("AOFDropdownMenu", () => {
  it("renders a closed trigger the menu opens from", () => {
    const html = renderToStaticMarkup(
      <AOFDropdownMenu>
        <AOFDropdownMenuTrigger>Account</AOFDropdownMenuTrigger>
      </AOFDropdownMenu>
    );
    expect(html).toContain("Account");
    expect(html).toContain('aria-expanded="false"');
  });
});
