// @module-tag unit
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOFBreadcrumb,
  AOFBreadcrumbItem,
  AOFBreadcrumbLink,
  AOFBreadcrumbList,
  AOFBreadcrumbPage,
  AOFBreadcrumbSeparator,
} from "../aof-breadcrumb";

/** The current crumb: marked, and holding the page's name. */
const CURRENT_USERS = /aria-current="page"[^>]*>Users</;

describe("AOFBreadcrumb", () => {
  it("renders a trail with the current page marked", () => {
    const html = renderToStaticMarkup(
      <AOFBreadcrumb>
        <AOFBreadcrumbList>
          <AOFBreadcrumbItem>
            <AOFBreadcrumbLink href="/">Back Office</AOFBreadcrumbLink>
          </AOFBreadcrumbItem>
          <AOFBreadcrumbSeparator />
          <AOFBreadcrumbItem>
            <AOFBreadcrumbPage>Users</AOFBreadcrumbPage>
          </AOFBreadcrumbItem>
        </AOFBreadcrumbList>
      </AOFBreadcrumb>
    );
    expect(html).toContain('aria-label="breadcrumb"');
    expect(html).toContain('href="/"');
    expect(html).toMatch(CURRENT_USERS);
  });
});
