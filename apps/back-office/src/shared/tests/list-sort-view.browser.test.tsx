// @module-tag integration

import { USER } from "@allonfire/auth/features/users/constants/users";
import { App } from "@allonfire/database/enums";
import { page, userEvent } from "vitest/browser";
import { ImagesTable } from "@/features/images/components/images-table";
import { IMAGES } from "@/features/images/constants/images";
import { UsersTable } from "@/features/users/components/users-table";
import { APP_ENTRY } from "@/shared/constants/apps";
import {
  addressOf,
  CELLS,
  FIRST_DAY,
  LAST_DAY,
  listAsked,
  listControls,
  renderList,
  setUpDesktopToday,
} from "./list-sort-view-harness";
import { IMAGES_PAGE, IMAGES_URL, USERS_PAGE, USERS_URL } from "./msw/handlers";
import { enT } from "./translators";

// Server actions: covered for real by e2e.
vi.mock("@/features/images/actions/delete-images", () => ({
  deleteImages: vi.fn(),
}));
vi.mock("@/features/users/actions/delete-users", () => ({
  deleteUsers: vi.fn(),
}));
vi.mock("@/features/i18n/navigation", () => import("./navigation-mock"));
vi.mock(
  "@allonfire/ui/shared/components/aof-image",
  () => import("./aof-image-mock")
);

/**
 * What the two lists share: Sort, View and the Created range (ADR 0031).
 * Each case names the list's controls, columns and params; the tests below
 * run on both.
 */
const CASES = [
  {
    answer: IMAGES_PAGE,
    children: <ImagesTable />,
    filter: "access:public",
    hidden: { id: "apps", label: enT("Images.column.apps") },
    hiddenSort: { id: "size", label: enT("Images.column.size") },
    // The column that once held the row's link.
    linkColumn: "alt",
    list: enT("Images.list"),
    name: "Images",
    params: IMAGES.PARAM,
    resetAll: enT("Images.filter.resetAll"),
    sorts: [
      { id: "size", label: enT("Images.column.size") },
      { id: "created", label: enT("Images.column.created") },
    ],
    url: IMAGES_URL,
    words: "sea",
  },
  {
    answer: USERS_PAGE,
    children: <UsersTable selfId="" />,
    filter: "app:laura",
    hidden: { id: App.LAURA, label: APP_ENTRY[App.LAURA].name },
    hiddenSort: { id: "created", label: enT("Users.column.created") },
    linkColumn: "created",
    list: enT("Users.list"),
    name: "Users",
    params: USER.PARAM,
    resetAll: enT("Users.filter.resetAll"),
    sorts: [
      { id: "email", label: enT("Users.column.email") },
      { id: "created", label: enT("Users.column.created") },
    ],
    url: USERS_URL,
    words: "isa",
  },
];

const FILTERS = /^Filters/;
const SORT_TAB = new RegExp(`^${enT("List.tab.sort")}`);
const VIEW_TAB = new RegExp(`^${enT("List.tab.view")}`);
const CREATED = new RegExp(`^${enT("Users.column.created")}`);
const { choose, openFilters, panel } = listControls(FILTERS);

setUpDesktopToday();

/** A case's two sortable columns, its params and a render of its list. */
const using = (one: (typeof CASES)[number]) => {
  const [first, second] = one.sorts;
  return {
    first,
    params: one.params,
    render: (search = "") =>
      renderList({ children: one.children, list: one.list, search }),
    second,
  };
};

describe.each(CASES)("$name list: column menus", (one) => {
  const { first, params, render, second } = using(one);

  it("sorts from a header menu: the address and the API ask for it", async () => {
    const asked = listAsked(one.url, one.answer);
    const { onUrlUpdate } = await render();
    await choose(first?.label ?? "", enT("List.column.desc"));
    await expect
      .poll(() => addressOf(onUrlUpdate).get(params.SORT))
      .toBe(`${first?.id}.desc`);
    await expect
      .poll(() => asked.at(-1)?.get(params.SORT))
      .toBe(`${first?.id}.desc`);
  });

  it("puts the column chosen last first, keeping the other", async () => {
    const { onUrlUpdate } = await render(`?${params.SORT}=${first?.id}.desc`);
    await choose(second?.label ?? "", enT("List.column.desc"));
    await expect
      .poll(() => addressOf(onUrlUpdate).get(params.SORT))
      .toBe(`${second?.id}.desc,${first?.id}.desc`);
  });

  it("hides a column, header and cells, writes hide and asks the API nothing again", async () => {
    const asked = listAsked(one.url, one.answer);
    const { onUrlUpdate, screen } = await render();
    await expect.poll(() => asked.length).toBeGreaterThan(0);
    const before = asked.length;
    const cells = screen.container.querySelectorAll(CELLS).length;
    await choose(one.hidden.label, enT("List.column.hide"));
    await expect
      .poll(() => addressOf(onUrlUpdate).get(params.HIDE))
      .toBe(one.hidden.id);
    await expect
      .element(page.getByRole("columnheader", { name: one.hidden.label }))
      .not.toBeInTheDocument();
    expect(screen.container.querySelectorAll(CELLS)).toHaveLength(cells - 1);
    expect(asked.length).toBe(before);
  });

  it("keeps sorting by a hidden column: the request holds the sort, the Sort tab lists it, no header is drawn", async () => {
    const asked = listAsked(one.url, one.answer);
    const column = one.hiddenSort;
    await render(
      `?${params.HIDE}=${column.id}&${params.SORT}=${column.id}.desc`
    );
    await expect
      .poll(() => asked.at(-1)?.get(params.SORT))
      .toBe(`${column.id}.desc`);
    await expect
      .element(page.getByRole("columnheader", { name: column.label }))
      .not.toBeInTheDocument();
    await openFilters();
    await userEvent.click(page.getByRole("tab", { name: SORT_TAB }));
    await expect
      .element(page.getByRole("combobox", { name: enT("List.sort.column") }))
      .toHaveTextContent(column.label);
  });
});

describe.each(CASES)("$name list: row link", (one) => {
  it("keeps every row one focusable link, with the column that once held it hidden", async () => {
    const { params, render } = using(one);
    const { screen } = await render(`?${params.HIDE}=${one.linkColumn}`);
    await expect
      .poll(() => screen.container.querySelectorAll("tbody tr").length)
      .toBeGreaterThan(0);
    for (const row of screen.container.querySelectorAll("tbody tr")) {
      const links = row.querySelectorAll("a[href]");
      expect(links).toHaveLength(1);
      expect(links[0]?.getAttribute("tabindex")).not.toBe("-1");
      // A box a click can land on: the link covers the row.
      expect(links[0]?.getBoundingClientRect().width).toBeGreaterThan(
        row.getBoundingClientRect().width / 2
      );
    }
  });
});

describe.each(CASES)("$name list: Filter panel", (one) => {
  const { first, params, render, second } = using(one);

  it("adds and resets sorts in the Sort tab", async () => {
    const { onUrlUpdate } = await render();
    await openFilters();
    await userEvent.click(page.getByRole("tab", { name: SORT_TAB }));
    await userEvent.click(
      panel().getByRole("button", { exact: true, name: enT("List.sort.add") })
    );
    await expect.poll(() => addressOf(onUrlUpdate).has(params.SORT)).toBe(true);
    await userEvent.click(
      page.getByRole("button", { name: enT("List.sort.reset") })
    );
    await expect
      .poll(() => addressOf(onUrlUpdate).has(params.SORT))
      .toBe(false);
  });

  it("shows every column again from the View tab's own button", async () => {
    const { onUrlUpdate } = await render(
      `?${params.HIDE}=${one.hidden.id},${one.hiddenSort.id}`
    );
    await openFilters();
    await userEvent.click(page.getByRole("tab", { name: VIEW_TAB }));
    await userEvent.click(
      panel().getByRole("button", { name: enT("List.view.showAll") })
    );
    await expect
      .poll(() => addressOf(onUrlUpdate).has(params.HIDE))
      .toBe(false);
  });

  it("clears the filters from the Filter tab's own button, keeping the sort", async () => {
    const { onUrlUpdate } = await render(
      `?${params.SEARCH}=${one.filter}&${params.SORT}=${first?.id}.desc`
    );
    await openFilters();
    await userEvent.click(
      panel().getByRole("button", {
        exact: true,
        name: enT("List.clear.filters"),
      })
    );
    await expect
      .poll(() => addressOf(onUrlUpdate).has(params.SEARCH))
      .toBe(false);
    expect(addressOf(onUrlUpdate).get(params.SORT)).toBe(`${first?.id}.desc`);
  });

  it("writes the range into the search, on the first page", async () => {
    const { onUrlUpdate } = await render(`?${params.PAGE}=2`);
    await openFilters();
    await userEvent.click(panel().getByRole("button", { name: CREATED }));
    await userEvent.click(page.getByRole("button", { name: FIRST_DAY }));
    await userEvent.click(page.getByRole("button", { name: LAST_DAY }));
    await expect
      .poll(() => addressOf(onUrlUpdate).get(params.SEARCH))
      .toBe("created:2026-11-26..2026-11-28");
    expect(addressOf(onUrlUpdate).has(params.PAGE)).toBe(false);
  });

  it("clears the sort, the hidden columns and the range with Clear all, and keeps the words", async () => {
    const { onUrlUpdate } = await render(
      `?${params.SEARCH}=created:2026-11-26 ${one.words}&${params.SORT}=${first?.id}.desc&${params.HIDE}=${one.hidden.id}`
    );
    await openFilters();
    await userEvent.click(
      panel().getByRole("button", { name: one.resetAll }).first()
    );
    await expect
      .poll(() => addressOf(onUrlUpdate).has(params.SORT))
      .toBe(false);
    expect(addressOf(onUrlUpdate).has(params.HIDE)).toBe(false);
    expect(addressOf(onUrlUpdate).get(params.SEARCH)).toBe(
      `input:${one.words}`
    );
  });

  it("counts the filters, the range, the sorts and the hidden columns on the button", async () => {
    await render(
      `?${params.SEARCH}=${one.filter} created:2026-11-26&${params.SORT}=${first?.id}.desc,${second?.id}.asc&${params.HIDE}=${one.hidden.id}`
    );
    // 1 filter + 1 range + 2 sorts + 1 hidden column.
    await expect
      .element(page.getByRole("button", { name: FILTERS }))
      .toHaveTextContent("5");
  });
});
