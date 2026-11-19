// @module-tag integration
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { IconHome, IconPhoto, IconServer2 } from "@tabler/icons-react";
import { page } from "vitest/browser";
import { navigationAt } from "../../../shared/tests/navigation-mock";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import { AOFFrameBreadcrumb } from "../components/aof-frame-breadcrumb";
import type { AppDescriptor } from "../types/app-descriptor";

vi.mock(
  "@allonfire/core/features/next/i18n/utils/aof-base-navigation",
  () => import("../../../shared/tests/navigation-mock")
);

const common = SHARED_TRANSLATIONS.en.Common.Navigation;
/** The App, the Section and its page, in the crumbs' order. */
const OFFICE_STORAGE_IMAGES = /Office.*Storage.*Images/;
const messages = {
  Navigation: { home: "Home", images: "Images", storage: "Storage" },
};
const APP = {
  name: "Office",
  sections: [
    { icon: IconHome, label: "home", path: "" },
    {
      icon: IconServer2,
      label: "storage",
      pages: [{ icon: IconPhoto, label: "images", path: "/storage/images" }],
      path: "/storage",
    },
  ],
} as const satisfies Pick<AppDescriptor, "name" | "sections">;

const renderAt = (
  pathname: string,
  crumbMark?: (position: string, label?: string) => React.ReactNode
) => {
  navigationAt.pathname = pathname;
  return renderInUi({
    children:
      crumbMark === undefined ? (
        <AOFFrameBreadcrumb app={APP} />
      ) : (
        <AOFFrameBreadcrumb app={APP} crumbMark={crumbMark} />
      ),
    messages,
  });
};

const breadcrumb = () =>
  page.getByRole("navigation", { exact: true, name: common.breadcrumb });

describe("AOFFrameBreadcrumb", () => {
  it("shows Home alone on Home", async () => {
    await renderAt("/");
    await expect.element(breadcrumb()).toHaveTextContent("Home");
    await expect.element(breadcrumb()).not.toHaveTextContent("Office");
  });

  it("names the App, the Section and its page on the page's own address", async () => {
    await renderAt("/storage/images");
    await expect.element(breadcrumb()).toHaveTextContent(OFFICE_STORAGE_IMAGES);
    expect(
      breadcrumb().element().querySelector('[aria-current="page"]')?.textContent
    ).toBe("Images");
  });

  it("draws each crumb's number through the App's mark: 00 the App, then its place in the menu and under the Section", async () => {
    await renderAt("/storage/images", (position) => (
      <b data-testid="mark">{position}</b>
    ));
    const marks = [...breadcrumb().element().querySelectorAll("b")].map(
      (mark) => mark.textContent
    );
    expect(marks).toEqual(["00", "02", "01"]);
  });

  it("hands the mark the label of the Section or page it stands for, none for the App", async () => {
    await renderAt("/storage/images", (_position, label) => (
      <b data-testid="mark">{label ?? "app"}</b>
    ));
    const marks = [...breadcrumb().element().querySelectorAll("b")].map(
      (mark) => mark.textContent
    );
    expect(marks).toEqual(["app", "storage", "images"]);
  });

  it("draws no number without a mark", async () => {
    await renderAt("/storage/images");
    expect(breadcrumb().element().querySelector("b")).toBeNull();
  });
});
