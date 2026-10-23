// @module-tag integration
import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { DATE } from "@allonfire/core/features/i18n/constants/dates";
import {
  I18N,
  languageSchema,
} from "@allonfire/core/features/i18n/constants/locales";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, Role } from "@allonfire/database/enums";
import { AOFToaster } from "@allonfire/ui/components/aof-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, HttpResponse, http } from "msw";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { z } from "zod";
import { APP_ENTRY } from "@/shared/constants/apps";
import { BACK_OFFICE } from "@/shared/constants/back-office";
import { USERS_PAGE, USERS_URL } from "@/shared/tests/msw/handlers";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import IT from "../../../i18n/translations/it.json" with { type: "json" };
import { USERS } from "../../constants/users";
import { userHref } from "../user-columns";
import { UsersTable } from "../users-table";

const t = EN.Users;
/**
 * Well past the box's typing rest (WebKit types slower) and TanStack's first
 * retry delay (1s).
 */
const WAIT_MS = 3 * UNIT.MS_PER_SECOND;
/** The first try and the retries a server failure gets. */
const QUERY_ATTEMPTS = 1 + USERS.RETRIES;
/** The words typed into the search box. */
const TEXT = "isa";
const LAURA = APP_ENTRY[App.LAURA].name;
/** The search as the address holds it: the words, then with a filter or two. */
const WORDS = USER_SEARCH.serialize({ text: TEXT });
const IN_LAURA = USER_SEARCH.serialize({ app: App.LAURA, text: TEXT });
const ADMIN_IN_LAURA = USER_SEARCH.serialize({
  app: App.LAURA,
  role: Role.ADMIN,
  text: TEXT,
});
const ADMIN = USER_SEARCH.serialize({ role: Role.ADMIN, text: TEXT });
/** A list two pages long, and a page past its end. */
const TWO_PAGES = { pageCount: 2, total: 30 };
const PAST_THE_END = 5;
/** How long the next page's answer is held back. */
const SLOW_MS = 400;

vi.mock("@/features/i18n/navigation", () => ({
  Link: ({ children, ...props }: { children: ReactNode; href: string }) => (
    <a {...props}>{children}</a>
  ),
}));

/** Every query the list sent, as its search params. */
const sent: URLSearchParams[] = [];
const listAnswering = (answer: () => Response | Promise<Response>) =>
  worker.use(
    http.get(USERS_URL, ({ request }) => {
      sent.push(new URL(request.url).searchParams);
      return answer();
    })
  );

const renderAt = (
  search = "",
  onUrlUpdate: (event: UrlUpdateEvent) => void = vi.fn(),
  messages: typeof EN = EN,
  selfId = ""
) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <NuqsTestingAdapter
        hasMemory
        onUrlUpdate={onUrlUpdate}
        searchParams={search}
      >
        <NextIntlClientProvider
          formats={DATE.FORMATS}
          locale={
            messages === EN ? I18N.DEFAULT_LANGUAGE : languageSchema.enum.it
          }
          messages={messages}
          timeZone={DATE.TIME_ZONE}
        >
          <UsersTable selfId={selfId} />
          <AOFToaster />
        </NextIntlClientProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );

const lastQuery = (onUrlUpdate: ReturnType<typeof vi.fn>) =>
  new URLSearchParams(onUrlUpdate.mock.lastCall?.[0].queryString);

beforeEach(() => {
  sent.length = 0;
  return page.viewport(
    SCREEN.VIEWPORT.DESKTOP.WIDTH,
    SCREEN.VIEWPORT.DESKTOP.HEIGHT
  );
});

describe("UsersTable", () => {
  it("shows the email, a column per App and when each User joined", async () => {
    const screen = await renderAt();
    const table = screen.getByRole("table", { name: t.list });
    await expect.element(table).toBeVisible();
    await Promise.all(
      [
        t.column.email,
        LAURA,
        APP_ENTRY[App.BACK_OFFICE].name,
        t.column.created,
      ].map((header) =>
        expect.element(table.getByText(header, { exact: true })).toBeVisible()
      )
    );
    await expect
      .element(table.getByText(t.noMembership).first())
      .toBeInTheDocument();
    const [laura] = USERS_PAGE.users;
    await expect
      .element(table.getByRole("link", { name: laura?.email }))
      .toHaveAttribute("href", userHref(laura?.id ?? ""));
  });
});

describe("UsersTable controls", () => {
  it("searches by email once typing rests, back on the first page", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    listAnswering(() => HttpResponse.json(USERS_PAGE));
    const screen = await renderAt(`?${USER.PARAM.PAGE}=2`, onUrlUpdate);
    await screen.getByRole("searchbox", { name: t.search.label }).fill(TEXT);
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH), {
        timeout: WAIT_MS,
      })
      .toBe(WORDS);
    expect(lastQuery(onUrlUpdate).get(USER.PARAM.PAGE)).toBeNull();
    await expect.poll(() => sent.at(-1)?.get(USER.PARAM.SEARCH)).toBe(WORDS);
  });

  it("turns a field typed in the box into its filter, which then clears", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt("", onUrlUpdate);
    const box = screen.getByRole("searchbox", { name: t.search.label });
    await box.fill(IN_LAURA);
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH), {
        timeout: WAIT_MS,
      })
      .toBe(IN_LAURA);
    await expect.element(box).toHaveValue(TEXT);
    expect(onUrlUpdate.mock.lastCall?.[0].options.history).toBe(
      USERS.HISTORY.SEARCH.history
    );
    await screen.getByRole("button", { name: t.filter.app }).click();
    await page.getByRole("option", { name: t.filter.reset }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(WORDS);
    await new Promise((settle) => setTimeout(settle, WAIT_MS));
    expect(lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH)).toBe(WORDS);
  });

  it("writes the App and the Role into the search, and Reset takes them out", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt(`?${USER.PARAM.SEARCH}=${TEXT}`, onUrlUpdate);
    await screen.getByRole("button", { name: t.filter.app }).click();
    await page.getByRole("option", { name: LAURA }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(IN_LAURA);
    await screen.getByRole("button", { name: t.filter.role }).click();
    await page.getByRole("option", { name: EN.Navigation.role.ADMIN }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(ADMIN_IN_LAURA);
    // The Role list closes before the App list opens.
    await expect
      .element(page.getByRole("option").first())
      .not.toBeInTheDocument();
    await screen.getByRole("button", { name: t.filter.app }).click();
    await page.getByRole("option", { name: t.filter.reset }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(ADMIN);
  });

  it("filters by App from the Faceted list's search", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt("", onUrlUpdate);
    await screen.getByRole("button", { name: t.filter.app }).click();
    await page
      .getByRole("combobox", { name: t.filter.search })
      .fill(LAURA.slice(0, 3));
    await expect
      .element(
        page.getByRole("option", { name: APP_ENTRY[App.BACK_OFFICE].name })
      )
      .not.toBeInTheDocument();
    await page.getByRole("option", { name: LAURA }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(USER_SEARCH.serialize({ app: App.LAURA, text: "" }));
  });

  it("Reset clears only its own filter", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt(
      `?${new URLSearchParams({ [USER.PARAM.PAGE]: "3", [USER.PARAM.SEARCH]: ADMIN_IN_LAURA })}`,
      onUrlUpdate
    );
    await screen.getByRole("button", { name: t.filter.role }).click();
    await page.getByRole("option", { name: t.filter.reset }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(IN_LAURA);
    expect(lastQuery(onUrlUpdate).has(USER.PARAM.PAGE)).toBe(false);
  });

  it("the lists speak the page's language", async () => {
    const screen = await renderAt(
      `?${USER.PARAM.SEARCH}=${IN_LAURA}`,
      vi.fn(),
      IT
    );
    await screen.getByRole("button", { name: IT.Users.filter.app }).click();
    await expect
      .element(page.getByRole("option", { name: IT.Users.filter.reset }))
      .toBeVisible();
    await expect
      .element(page.getByRole("combobox", { name: IT.Users.filter.search }))
      .toBeVisible();
  });
});

describe("UsersTable add", () => {
  it("the Add button is a primary link to the Add page, last in the toolbar", async () => {
    const screen = await renderAt();
    const add = screen.getByRole("link", { name: t.add.button });
    await expect.element(add).toBeVisible();
    await expect
      .element(add)
      .toHaveAttribute("href", `${BACK_OFFICE.PAGE.USERS}${USERS.PATH.NEW}`);
  });
});

describe("UsersTable paging", () => {
  it("asks for the next page and keeps the rows until it comes", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    listAnswering(async () => {
      if (sent.length > 1) {
        await delay(SLOW_MS);
      }
      return HttpResponse.json({ ...USERS_PAGE, ...TWO_PAGES });
    });
    const screen = await renderAt("", onUrlUpdate);
    const [laura] = USERS_PAGE.users;
    const row = screen.getByRole("table").getByText(laura?.email ?? "");
    await expect.element(row).toBeVisible();
    await screen.getByRole("button", { name: t.pagination.next }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.PAGE))
      .toBe(String(TWO_PAGES.pageCount));
    await expect.element(row).toBeVisible();
    await expect
      .poll(() => sent.at(-1)?.get(USER.PARAM.PAGE))
      .toBe(String(TWO_PAGES.pageCount));
  });

  it("offers 25, 50 and 100 rows per page", async () => {
    const screen = await renderAt();
    await screen
      .getByRole("combobox", { name: t.pagination.rowsPerPage })
      .click();
    await Promise.all(
      USER.PAGE_SIZES.map((size) =>
        expect
          .element(page.getByRole("option", { name: String(size) }))
          .toBeVisible()
      )
    );
    await userEvent.keyboard("{Escape}");
  });
});

describe("UsersTable states", () => {
  it("says when no User matches", async () => {
    listAnswering(() =>
      HttpResponse.json({ pageCount: 0, total: 0, users: [] })
    );
    const screen = await renderAt();
    await expect.element(screen.getByText(t.empty.title)).toBeVisible();
  });

  it("past the last page, shows the empty state and the way back", async () => {
    listAnswering(() => HttpResponse.json({ ...TWO_PAGES, users: [] }));
    const screen = await renderAt(`?${USER.PARAM.PAGE}=${PAST_THE_END}`);
    await expect.element(screen.getByText(t.pastEnd.title)).toBeVisible();
    await expect
      .element(screen.getByRole("button", { name: t.pagination.first }))
      .toBeEnabled();
  });

  it("past the end of a search nobody matches, says nobody matches", async () => {
    listAnswering(() =>
      HttpResponse.json({ pageCount: 0, total: 0, users: [] })
    );
    const screen = await renderAt(`?${USER.PARAM.PAGE}=${PAST_THE_END}`);
    await expect.element(screen.getByText(t.empty.title)).toBeVisible();
  });

  it("past the last page on a phone, says so and steps back to the last page", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    listAnswering(() => HttpResponse.json({ ...TWO_PAGES, users: [] }));
    const screen = await renderAt(
      `?${USER.PARAM.PAGE}=${PAST_THE_END}`,
      onUrlUpdate
    );
    await expect.element(screen.getByText(t.pastEnd.title)).toBeVisible();
    await screen.getByRole("button", { name: t.pagination.previous }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.PAGE))
      .toBe(String(TWO_PAGES.pageCount));
  });

  it("says when the Users cannot be loaded, and tries again", async () => {
    // The first answer and the query's own one retry fail; the button's
    // succeeds.
    listAnswering(() =>
      sent.length <= QUERY_ATTEMPTS
        ? HttpResponse.json(
            { status: HTTP.STATUS.INTERNAL_SERVER_ERROR },
            { status: HTTP.STATUS.INTERNAL_SERVER_ERROR }
          )
        : HttpResponse.json(USERS_PAGE)
    );
    const screen = await renderAt();
    await expect
      .element(screen.getByText(t.error.title), { timeout: WAIT_MS })
      .toBeVisible();
    await screen.getByRole("button", { name: t.error.retry }).click();
    const [laura] = USERS_PAGE.users;
    await expect
      .element(screen.getByRole("table").getByText(laura?.email ?? ""))
      .toBeVisible();
  });
});

// Deletion: Laura's Admin is the signed-in User, so the other Fixture is the
// one a test selects.
const [LAURA_ADMIN, NO_APP] = USERS_PAGE.users;
const SELF = LAURA_ADMIN?.id ?? "";
const OTHER_EMAIL = NO_APP?.email ?? "";
const del = t.delete;
/** The copy the plural ICU strings give for one User. */
const ONE_SELECTED = "1 selected";
const DELETE_ONE = "Delete 1 User?";
const ONE_DELETED = "1 User deleted";
const selectLabel = (email: string) => del.select.replace("{email}", email);

/** Every deletion the table sent, as the ids it named. */
const deletions: string[][] = [];
const deleteAnswering = (
  answer: (ids: string[]) => Response | Promise<Response> = (ids) =>
    HttpResponse.json({ deleted: ids.length })
) =>
  worker.use(
    http.delete(USERS_URL, async ({ request }) => {
      const { ids } = z
        .object({ ids: z.array(z.string()) })
        .parse(await request.json());
      deletions.push(ids);
      return answer(ids);
    })
  );

const renderAsSelf = (search = "") => renderAt(search, vi.fn(), EN, SELF);
const bar = () => page.getByRole("toolbar");
const dialog = () => page.getByRole("alertdialog");

describe("UsersTable selection", () => {
  beforeEach(() => {
    deletions.length = 0;
    deleteAnswering();
  });

  it("your own row has no checkbox", async () => {
    const screen = await renderAsSelf();
    const table = screen.getByRole("table");
    await expect
      .element(table.getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) }))
      .toBeVisible();
    await expect
      .element(
        table.getByRole("checkbox", {
          name: selectLabel(LAURA_ADMIN?.email ?? ""),
        })
      )
      .not.toBeInTheDocument();
  });

  it("selecting a row shows the bar with the count, and closing it clears the selection", async () => {
    const screen = await renderAsSelf();
    const box = screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) });
    await box.click();
    await expect.element(bar().getByText(ONE_SELECTED)).toBeVisible();
    await bar().getByRole("button", { name: del.clear }).click();
    await expect.element(bar()).not.toBeInTheDocument();
    await expect.element(box).not.toBeChecked();
  });

  it("a page change clears the selection", async () => {
    listAnswering(() => HttpResponse.json({ ...USERS_PAGE, ...TWO_PAGES }));
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await expect.element(bar()).toBeVisible();
    await screen.getByRole("button", { name: t.pagination.next }).click();
    await expect.element(bar()).not.toBeInTheDocument();
  });

  it("a card on a phone selects too", async () => {
    await page.viewport(
      SCREEN.VIEWPORT.PHONE.WIDTH,
      SCREEN.VIEWPORT.PHONE.HEIGHT
    );
    const screen = await renderAsSelf();
    await screen
      .getByRole("list", { name: t.list })
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await expect.element(bar().getByText(ONE_SELECTED)).toBeVisible();
  });
});

describe("UsersTable deletion", () => {
  beforeEach(() => {
    deletions.length = 0;
    deleteAnswering();
  });

  it("select-all leaves your own row out", async () => {
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: del.selectAll })
      .click();
    await bar().getByRole("button", { name: del.action }).click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.poll(() => deletions).toEqual([[NO_APP?.id]]);
  });

  it("Delete asks first; Cancel keeps the selection", async () => {
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await bar().getByRole("button", { name: del.action }).click();
    await expect.element(dialog().getByText(DELETE_ONE)).toBeVisible();
    await expect.element(dialog().getByText(del.description)).toBeVisible();
    await dialog().getByRole("button", { name: del.cancel }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(bar().getByText(ONE_SELECTED)).toBeVisible();
    expect(deletions).toEqual([]);
  });

  it("while deleting, Escape leaves the dialog open", async () => {
    deleteAnswering(() => new Promise<Response>(() => undefined));
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await bar().getByRole("button", { name: del.action }).click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.poll(() => deletions.length).toBe(1);
    await userEvent.keyboard("{Escape}");
    await expect.element(dialog()).toBeVisible();
  });

  it("confirming deletes, says how many, clears the selection and refetches the list", async () => {
    listAnswering(() => HttpResponse.json(USERS_PAGE));
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    const asked = sent.length;
    await bar().getByRole("button", { name: del.action }).click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(page.getByText(ONE_DELETED)).toBeVisible();
    await expect.element(bar()).not.toBeInTheDocument();
    await expect.poll(() => sent.length).toBeGreaterThan(asked);
  });

  it("keeps the selection and says so when the delete fails", async () => {
    deleteAnswering(
      () =>
        new HttpResponse(null, { status: HTTP.STATUS.INTERNAL_SERVER_ERROR })
    );
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await bar().getByRole("button", { name: del.action }).click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(page.getByText(del.failed)).toBeVisible();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(bar().getByText(ONE_SELECTED)).toBeVisible();
  });

  it("after deleting the last page's rows, offers the way back", async () => {
    let gone = false;
    listAnswering(() =>
      HttpResponse.json(
        gone
          ? { pageCount: 1, total: 1, users: [] }
          : { ...TWO_PAGES, users: [NO_APP] }
      )
    );
    deleteAnswering((ids) => {
      gone = true;
      return HttpResponse.json({ deleted: ids.length });
    });
    const screen = await renderAt(
      `?${USER.PARAM.PAGE}=${TWO_PAGES.pageCount}`,
      vi.fn(),
      EN,
      SELF
    );
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await bar().getByRole("button", { name: del.action }).click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(screen.getByText(t.pastEnd.title)).toBeVisible();
  });
});
