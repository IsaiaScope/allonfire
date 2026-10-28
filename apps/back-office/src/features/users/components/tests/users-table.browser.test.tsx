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
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/shared-translations";
import { aofErrorCaches } from "@allonfire/core/features/next/query/aof-query-errors";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { UNIT } from "@allonfire/core/shared/constants/units";
import { App, Role } from "@allonfire/database/enums";
import { aofNotifyError } from "@allonfire/ui/components/aof-query-provider";
import { AOFToaster } from "@allonfire/ui/components/aof-toaster";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { delay, HttpResponse, http } from "msw";
import { NextIntlClientProvider } from "next-intl";
import { NuqsTestingAdapter, type UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { APP_ENTRY } from "@/shared/constants/apps";
import { USERS_PAGE, USERS_URL } from "@/shared/tests/msw/handlers";
import EN from "../../../i18n/translations/en.json" with { type: "json" };
import IT from "../../../i18n/translations/it.json" with { type: "json" };
import { deleteUsers } from "../../actions/delete-users";
import { USERS } from "../../constants/users";
import { newUserHref, userHref } from "../../utils/user-href";
import { UsersListSkeleton } from "../users-list-skeleton";
import { UsersTable } from "../users-table";

const t = EN.Users;
/**
 * Well past the box's typing rest (WebKit types slower) and TanStack's first
 * retry delay (1s).
 */
const WAIT_MS = 3 * UNIT.MS_PER_SECOND;
/** The first try and the retries a server failure gets. */
const QUERY_ATTEMPTS = 1 + USERS.RETRIES;
/** Inside shadcn's 40px hit area around a 16px checkbox: 12px a side. */
const HIT_AREA_SLACK_PX = 8;
/** The words typed into the search box. */
const TEXT = "isa";
const LAURA = APP_ENTRY[App.LAURA].name;
/** The search as the address holds it: the words, then with a filter or two. */
const WORDS = USER_SEARCH.serialize({ text: TEXT });
const IN_LAURA = USER_SEARCH.serialize({ app: [App.LAURA], text: TEXT });
const ADMIN_IN_LAURA = USER_SEARCH.serialize({
  app: [App.LAURA],
  role: [Role.ADMIN],
  text: TEXT,
});
/** A list two pages long, and a page past its end. */
const TWO_PAGES = { pageCount: 2, total: 30 };
const PAST_THE_END = 5;
/** How long the next page's answer is held back. */
const SLOW_MS = 400;

// A server action: covered for real by e2e.
vi.mock("../../actions/delete-users", () => ({ deleteUsers: vi.fn() }));
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

const language = (messages: typeof EN) =>
  messages === EN ? I18N.DEFAULT_LANGUAGE : languageSchema.enum.it;

// Vite hands ui's next/image over as a module object, not a component; an
// App's mark (a User's card) only needs an element there.
vi.mock("@allonfire/ui/components/aof-image", () => ({
  AOFImage: ({ alt, src }: { alt: string; src: string }) => (
    <span data-alt={alt} data-src={src} />
  ),
}));

const renderAt = (
  search = "",
  onUrlUpdate: (event: UrlUpdateEvent) => void = vi.fn(),
  messages: typeof EN = EN,
  selfId = ""
) =>
  render(
    <QueryClientProvider
      client={
        new QueryClient({
          ...aofErrorCaches({
            fallback: SHARED_TRANSLATIONS.en.Common.Request.failed,
            notify: aofNotifyError,
          }),
          defaultOptions: { queries: { retry: false } },
        })
      }
    >
      <NuqsTestingAdapter
        hasMemory
        onUrlUpdate={onUrlUpdate}
        searchParams={search}
      >
        <NextIntlClientProvider
          formats={DATE.FORMATS}
          locale={language(messages)}
          // The App's words over core's shared ones (the toaster's), as the
          // App's request config merges them.
          messages={{ ...SHARED_TRANSLATIONS[language(messages)], ...messages }}
          timeZone={DATE.TIME_ZONE}
        >
          <UsersTable selfId={selfId} />
          <AOFToaster />
        </NextIntlClientProvider>
      </NuqsTestingAdapter>
    </QueryClientProvider>
  );

/** What the open tooltip says (Base UI's popup carries no role). */
const tipText = () =>
  document.querySelector('[data-slot="tooltip-content"]')?.textContent;

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
      .element(
        table.getByRole("link", {
          name: t.open.replace("{email}", laura?.email ?? ""),
        })
      )
      .toHaveAttribute("href", userHref(laura?.id ?? ""));
  });

  it("its skeleton draws as many columns as the table", async () => {
    const screen = await renderAt();
    const table = screen.getByRole("table", { name: t.list });
    await expect.element(table.getByText(t.column.email)).toBeVisible();
    const skeleton = await render(
      <NextIntlClientProvider locale={I18N.DEFAULT_LANGUAGE} messages={EN}>
        <UsersListSkeleton />
      </NextIntlClientProvider>
    );
    // The skeleton's header row: one placeholder per column.
    const head = skeleton.container.querySelector(
      '[data-slot="aof-data-table-skeleton"] .grid'
    );
    expect(head?.children.length).toBe(
      table.element().querySelectorAll("th").length
    );
  });

  it("copies an email on a click, and says so in its tip, never a toast", async () => {
    const writeText = vi
      .spyOn(navigator.clipboard, "writeText")
      .mockResolvedValue();
    const screen = await renderAt();
    const [laura] = USERS_PAGE.users;
    const email = laura?.email ?? "";
    await screen
      .getByRole("table", { name: t.list })
      .getByRole("button", { name: t.copy.label.replace("{email}", email) })
      .click();
    expect(writeText).toHaveBeenCalledWith(email);
    await expect.poll(tipText).toBe(t.copy.done);
    expect(document.querySelector("[data-sonner-toast]")).toBeNull();
  });

  it("a second copy keeps the tip open its full time again", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockResolvedValue();
    const screen = await renderAt();
    const [laura] = USERS_PAGE.users;
    const button = screen
      .getByRole("table", { name: t.list })
      .getByRole("button", {
        name: t.copy.label.replace("{email}", laura?.email ?? ""),
      });
    await button.click();
    await expect.poll(tipText).toBe(t.copy.done);
    await new Promise((resolve) => setTimeout(resolve, USERS.COPIED_MS / 2));
    await button.click();
    // Past the first copy's end, inside the second's.
    await new Promise((resolve) =>
      setTimeout(resolve, (USERS.COPIED_MS * 3) / 4)
    );
    expect(tipText()).toBe(t.copy.done);
  });

  it("says so in the tip from the keyboard too, and when the copy fails", async () => {
    vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
      new Error("denied")
    );
    const screen = await renderAt();
    const [laura] = USERS_PAGE.users;
    const button = screen
      .getByRole("table", { name: t.list })
      .getByRole("button", {
        name: t.copy.label.replace("{email}", laura?.email ?? ""),
      });
    await expect.element(button).toBeVisible();
    button.element().focus();
    await userEvent.keyboard("{Enter}");
    await expect.poll(tipText).toBe(t.copy.failed);
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
    await screen.getByRole("button", { name: t.filter.button }).click();
    await page
      .getByRole("button", { exact: true, name: t.filter.resetAll })
      .click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(WORDS);
    await new Promise((settle) => setTimeout(settle, WAIT_MS));
    expect(lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH)).toBe(WORDS);
  });
});

/** Opens the Filter panel, then the list named `name` inside it. */
const openList = async (name: string, filter = t.filter.button) => {
  await page.getByRole("button", { name: filter }).click();
  await page.getByRole("button", { name }).click();
};

describe("UsersTable filters", () => {
  it("writes any number of Apps and Roles into the search, the lists staying open", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderAt(`?${USER.PARAM.SEARCH}=${TEXT}`, onUrlUpdate);
    await openList(t.filter.app);
    await page.getByRole("option", { name: LAURA }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(IN_LAURA);
    await expect
      .element(page.getByRole("option", { name: LAURA }))
      .toHaveAttribute("aria-checked", "true");
    await userEvent.keyboard("{Escape}");
    await page.getByRole("button", { name: t.filter.role }).click();
    await page.getByRole("option", { name: EN.Navigation.role.ADMIN }).click();
    await page.getByRole("option", { name: EN.Navigation.role.USER }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(
        USER_SEARCH.serialize({
          app: [App.LAURA],
          role: [Role.ADMIN, Role.USER],
          text: TEXT,
        })
      );
    // Choosing a chosen value again takes it out.
    await page.getByRole("option", { name: EN.Navigation.role.USER }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(ADMIN_IN_LAURA);
  });

  it("counts the values chosen on the Filter button, and a list's past two", async () => {
    const screen = await renderAt(
      `?${USER.PARAM.SEARCH}=${USER_SEARCH.serialize({ app: [App.LAURA], role: [Role.ADMIN, Role.USER, Role.VIEWER], text: "" })}`
    );
    await screen.getByRole("button", { name: `${t.filter.button} 4` }).click();
    await expect
      .element(
        page.getByRole("button", {
          name: `${t.filter.role} ${t.filter.selected.replace("{count}", "3")}`,
        })
      )
      .toBeVisible();
    await expect
      .element(page.getByRole("button", { name: `${t.filter.app} ${LAURA}` }))
      .toBeVisible();
  });

  it("searches a list by its labels", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderAt("", onUrlUpdate);
    await openList(t.filter.app);
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
      .toBe(USER_SEARCH.serialize({ app: [App.LAURA], text: "" }));
  });

  it("a list's Reset clears only that list", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    await renderAt(`?${USER.PARAM.SEARCH}=${ADMIN_IN_LAURA}`, onUrlUpdate);
    await openList(t.filter.role, `${t.filter.button} 2`);
    await page.getByRole("option", { name: t.filter.reset }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(IN_LAURA);
  });

  it("Reset filters clears every list, keeps the words, and goes back to the first page", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    const screen = await renderAt(
      `?${new URLSearchParams({ [USER.PARAM.PAGE]: "3", [USER.PARAM.SEARCH]: ADMIN_IN_LAURA })}`,
      onUrlUpdate
    );
    await screen.getByRole("button", { name: t.filter.button }).click();
    await page
      .getByRole("button", { exact: true, name: t.filter.resetAll })
      .click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.SEARCH))
      .toBe(WORDS);
    expect(lastQuery(onUrlUpdate).has(USER.PARAM.PAGE)).toBe(false);
  });

  it("Reset filters is off while nothing is chosen", async () => {
    const screen = await renderAt();
    await screen.getByRole("button", { name: t.filter.button }).click();
    await expect
      .element(
        page.getByRole("button", { exact: true, name: t.filter.resetAll })
      )
      .toBeDisabled();
  });

  it("the panel speaks the page's language", async () => {
    await renderAt(`?${USER.PARAM.SEARCH}=${IN_LAURA}`, vi.fn(), IT);
    await openList(IT.Users.filter.app, IT.Users.filter.button);
    await expect
      .element(page.getByRole("heading", { name: IT.Users.filter.button }))
      .toBeVisible();
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
    await expect.element(add).toHaveAttribute("href", newUserHref());
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
    const row = screen
      .getByRole("table")
      .getByText(laura?.email ?? "", { exact: true });
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

describe("UsersTable notices", () => {
  it("nobody matching, clears the search back to the first page", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    listAnswering(() =>
      HttpResponse.json({ pageCount: 0, total: 0, users: [] })
    );
    const screen = await renderAt(
      `?${USER.PARAM.SEARCH}=nobody&${USER.PARAM.PAGE}=2`,
      onUrlUpdate
    );
    await screen.getByRole("button", { name: t.empty.clear }).click();
    await expect.poll(() => lastQuery(onUrlUpdate).toString()).toBe("");
  });

  it("past the last page, goes to the last page", async () => {
    const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
    listAnswering(() => HttpResponse.json({ ...TWO_PAGES, users: [] }));
    const screen = await renderAt(
      `?${USER.PARAM.PAGE}=${PAST_THE_END}`,
      onUrlUpdate
    );
    await screen.getByRole("button", { name: t.pastEnd.last }).click();
    await expect
      .poll(() => lastQuery(onUrlUpdate).get(USER.PARAM.PAGE))
      .toBe(String(TWO_PAGES.pageCount));
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
      .element(
        screen.getByRole("table").getByText(laura?.email ?? "", { exact: true })
      )
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
const DELETE_ONE = "Delete 1 User?";
const ONE_DELETED = "1 User deleted";
const ALREADY_GONE_ONE = "This User had already been deleted";
const selectLabel = (email: string) => del.select.replace("{email}", email);

/** Every deletion the table sent, as the ids it named. */
const deletions: string[][] = [];
const deleteAnswering = (
  answer: (ids: string[]) => number | null | Promise<number | null> = (ids) =>
    ids.length
) =>
  vi.mocked(deleteUsers).mockImplementation((ids) => {
    deletions.push(ids);
    return Promise.resolve(answer(ids));
  });

const renderAsSelf = (search = "") => renderAt(search, vi.fn(), EN, SELF);
/** The toolbar's Delete; exact, so the dialog's own Delete never matches. */
const deleteButton = () =>
  page.getByRole("button", { exact: true, name: del.action });
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

  it("Delete is enabled only while a row is selected", async () => {
    const screen = await renderAsSelf();
    const box = screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) });
    await expect.element(deleteButton()).toBeDisabled();
    await box.click();
    await expect.element(box).toBeChecked();
    await expect.element(deleteButton()).toBeEnabled();
    await box.click();
    await expect.element(box).not.toBeChecked();
    await expect.element(deleteButton()).toBeDisabled();
  });

  it("a row's checkbox takes its whole hit area, never the row's link", async () => {
    const screen = await renderAsSelf();
    const box = screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) });
    await expect.element(box).toBeVisible();
    const rect = box.element().getBoundingClientRect();
    const middle = rect.top + rect.height / 2;
    // shadcn widens the box's hit area to 40px across for a mouse: a click
    // a few pixels beside the 16px box still lands on it.
    const beside = HIT_AREA_SLACK_PX;
    for (const x of [rect.left - beside, rect.right + beside]) {
      expect(box.element().contains(document.elementFromPoint(x, middle))).toBe(
        true
      );
    }
  });

  it("a page change clears the selection", async () => {
    listAnswering(() => HttpResponse.json({ ...USERS_PAGE, ...TWO_PAGES }));
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await expect.element(deleteButton()).toBeEnabled();
    await screen.getByRole("button", { name: t.pagination.next }).click();
    await expect.element(deleteButton()).toBeDisabled();
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
    await expect
      .element(
        screen
          .getByRole("list", { name: t.list })
          .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      )
      .toBeChecked();
    await expect.element(deleteButton()).toBeEnabled();
  });

  it("select-all checks every selectable row", async () => {
    const screen = await renderAsSelf();
    const table = screen.getByRole("table");
    await table.getByRole("checkbox", { name: del.selectAll }).click();
    await expect
      .element(table.getByRole("checkbox", { name: del.selectAll }))
      .toBeChecked();
    await expect
      .element(table.getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) }))
      .toBeChecked();
  });
});

/** No deletion sent yet, and the API answering each one. */
const freshDeletions = () => {
  deletions.length = 0;
  deleteAnswering();
};

describe("UsersTable deletion", () => {
  beforeEach(freshDeletions);

  it("select-all leaves your own row out", async () => {
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: del.selectAll })
      .click();
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.poll(() => deletions).toEqual([[NO_APP?.id]]);
  });

  it("Delete asks first; Cancel keeps the selection", async () => {
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await deleteButton().click();
    await expect.element(dialog().getByText(DELETE_ONE)).toBeVisible();
    await expect.element(dialog().getByText(del.description)).toBeVisible();
    await dialog().getByRole("button", { name: del.cancel }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(deleteButton()).toBeEnabled();
    expect(deletions).toEqual([]);
  });

  it("confirming closes the question at once and fades the rows on their way out", async () => {
    deleteAnswering(() => new Promise<null>(() => undefined));
    const screen = await renderAsSelf();
    const box = screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) });
    await box.click();
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.poll(() => deletions.length).toBe(1);
    await expect.element(dialog()).not.toBeInTheDocument();
    const row = box.element().closest("tr");
    expect(row?.getAttribute("aria-busy")).toBe("true");
    expect(row?.inert).toBe(true);
    await expect.element(deleteButton()).toBeDisabled();
  });

  it("confirming deletes, says how many, clears the selection and refetches the list", async () => {
    listAnswering(() => HttpResponse.json(USERS_PAGE));
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    const asked = sent.length;
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(page.getByText(ONE_DELETED)).toBeVisible();
    await expect.element(deleteButton()).toBeDisabled();
    await expect.poll(() => sent.length).toBeGreaterThan(asked);
  });
});

describe("UsersTable deletion, past the usual path", () => {
  beforeEach(freshDeletions);

  it("says so when the User had already been deleted, then refetches", async () => {
    listAnswering(() => HttpResponse.json(USERS_PAGE));
    deleteAnswering(() => 0);
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    const asked = sent.length;
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(page.getByText(ALREADY_GONE_ONE)).toBeVisible();
    await expect.poll(() => sent.length).toBeGreaterThan(asked);
  });

  it("keeps the selection and says so when the delete fails", async () => {
    deleteAnswering(() => null);
    const screen = await renderAsSelf();
    await screen
      .getByRole("table")
      .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
      .click();
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(page.getByText(del.failed)).toBeVisible();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(deleteButton()).toBeEnabled();
    // The rows come back as they were: nothing was taken from the list.
    await expect
      .poll(() =>
        screen
          .getByRole("table")
          .getByRole("checkbox", { name: selectLabel(OTHER_EMAIL) })
          .element()
          .closest("tr")
          ?.hasAttribute("aria-busy")
      )
      .toBe(false);
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
      return ids.length;
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
    await deleteButton().click();
    await dialog().getByRole("button", { name: del.confirm }).click();
    await expect.element(screen.getByText(t.pastEnd.title)).toBeVisible();
  });
});
