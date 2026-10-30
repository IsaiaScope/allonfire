// @module-tag integration
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import { I18N } from "@allonfire/core/features/i18n/constants/locales";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { page } from "vitest/browser";
import { render } from "vitest-browser-react";
import { SectionPage } from "@/features/navigation/components/section-page";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import { UsersListSkeleton } from "../users-list-skeleton";
import { UsersTable } from "../users-table";

const t = EN.Users;
/** Narrower than the columns, so the table scrolls sideways. */
const BOX_WIDTH_PX = 480;
/** Shorter than a header and three rows. */
const SHORT_BOX_HEIGHT_PX = 100;
/** How far the test scrolls the table sideways. */
const SCROLL_LEFT_PX = 80;
/** The rows the box always has room for, under its header. */
const MIN_ROWS = 8;

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-users", () => ({ deleteUsers: vi.fn() }));
vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));
// Vite hands ui's next/image over as a module object, not a component.
vi.mock("@allonfire/ui/components/aof-image", () => ({
  AOFImage: ({ alt, src }: { alt: string; src: string }) => (
    <span data-alt={alt} data-src={src} />
  ),
}));

/** A page in a box `height` tall and narrower than the list's columns, as
 *  a phone turned sideways leaves it beside the sidebar: scrolling itself,
 *  as the frame's page area does on a wider screen. */
const PageBox = ({
  children,
  height,
}: {
  children: ReactNode;
  height: number;
}) => (
  <div
    className="flex flex-col overflow-y-auto"
    style={{ height, width: BOX_WIDTH_PX }}
  >
    <SectionPage>{children}</SectionPage>
  </div>
);

/** The list on its page, in a `PageBox`. */
const renderInBox = async (
  height: number = SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
) => {
  const screen = await render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NuqsTestingAdapter hasMemory>
        <NextIntlClientProvider
          formats={DATE.FORMATS}
          locale={I18N.DEFAULT_LANGUAGE}
          messages={{ ...SHARED_TRANSLATIONS.en, ...EN }}
          timeZone={DATE.TIME_ZONE}
        >
          <PageBox height={height}>
            <UsersTable selfId="" />
          </PageBox>
        </NextIntlClientProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );
  // The rows, not the skeleton drawn while the list loads.
  await vi.waitFor(() =>
    screen
      .getByRole("table", { name: t.list })
      .getByText(t.column.email, { exact: true })
      .element()
  );
  const rows = document.querySelector<HTMLElement>(
    '[data-slot="data-table-rows"]'
  );
  const sideways = document.querySelector<HTMLElement>(
    '[data-slot="data-table-viewport"]'
  );
  if (!(rows && sideways)) {
    throw new Error("the table's two boxes are missing");
  }
  return { rows, screen, sideways };
};

beforeEach(() =>
  page.viewport(
    SCREEN.VIEWPORT.PHONE_LANDSCAPE.WIDTH,
    SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT
  )
);

describe("UsersTable on a phone turned sideways", () => {
  it("lets each box move along one axis only", async () => {
    const { rows, sideways } = await renderInBox();
    expect(sideways.scrollWidth).toBeGreaterThan(sideways.clientWidth);
    expect(getComputedStyle(sideways)).toMatchObject({
      overflowY: "hidden",
      overscrollBehaviorX: "none",
    });
    expect(getComputedStyle(rows)).toMatchObject({
      overflowX: "hidden",
      // Base UI's own `overflow: scroll`, left on this axis.
      overflowY: "scroll",
    });
  });

  it("moves the header sideways with its columns", async () => {
    const { screen, sideways } = await renderInBox();
    sideways.scrollLeft = SCROLL_LEFT_PX;
    const table = screen.getByRole("table", { name: t.list });
    const heading = table
      .getByText(t.column.email, { exact: true })
      .element()
      .closest("th");
    if (!heading) {
      throw new Error("the Email column has no header cell");
    }
    const [firstRow] = table.getByRole("row").elements().slice(1);
    const cell = firstRow?.querySelectorAll("td")[heading.cellIndex];
    expect(sideways.scrollLeft).toBe(SCROLL_LEFT_PX);
    expect(cell?.getBoundingClientRect().left).toBe(
      heading.getBoundingClientRect().left
    );
  });

  it("reaches the sideways box by keyboard while its columns overflow", async () => {
    const { rows, sideways } = await renderInBox();
    // Each box is a stop only while it overflows, which Base UI measures
    // after the rows draw; the rows fit here. Its arrows are the browser's:
    // WebKit scrolls no focused box by them.
    await expect.poll(() => sideways.tabIndex).toBe(0);
    expect(rows.tabIndex).toBe(-1);
    sideways.focus();
    expect(document.activeElement).toBe(sideways);
  });

  it("never shrinks below a header and eight Users rows", async () => {
    const { sideways } = await renderInBox(SHORT_BOX_HEIGHT_PX);
    const [header, row] = [
      ...sideways.querySelectorAll("thead tr, tbody tr"),
    ].map((r) => r.getBoundingClientRect().height);
    // The box, its border included.
    const box = sideways.parentElement?.getBoundingClientRect();
    expect(box?.height).toBeGreaterThanOrEqual(
      (header ?? 0) + MIN_ROWS * (row ?? 0)
    );
  });

  it("keeps the page's padding under the pager when the table outgrows the screen", async () => {
    const { sideways } = await renderInBox();
    const section = sideways.closest("section");
    // The page grows to hold the table, rather than the table spilling past
    // the page and its padding.
    expect(section?.scrollHeight).toBe(section?.clientHeight);
  });

  it("draws its skeleton's table as tall as the table it waits for", async () => {
    const { sideways, screen } = await renderInBox();
    const table = sideways.parentElement?.getBoundingClientRect().height;
    screen.unmount();
    await render(
      <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
        <PageBox height={SCREEN.VIEWPORT.PHONE_LANDSCAPE.HEIGHT}>
          <UsersListSkeleton />
        </PageBox>
      </NextIntlClientProvider>
    );
    const skeleton = document
      .querySelector('[data-slot="aof-data-table-skeleton"] > [aria-hidden]')
      ?.getBoundingClientRect().height;
    expect(skeleton).toBe(table);
  });
});
