import { worker } from "@allonfire/config/tests/browser/msw";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { HttpResponse, http } from "msw";
import type { UrlUpdateEvent } from "nuqs/adapters/testing";
import type { ReactNode } from "react";
import { page, userEvent } from "vitest/browser";
import { renderInApp } from "./render-in-app";

/** The day the calendar opens on: a fixed one, so a range is the same on every run. */
const TODAY = new Date(2026, 10, 15, 12);
/** Two days of that month, as the calendar's buttons name them. */
export const FIRST_DAY = /November 26th,/;
export const LAST_DAY = /November 28th,/;
/** The cells of the table's first row. */
export const CELLS = "tbody tr:first-child td";

type UrlUpdate = ReturnType<typeof vi.fn<(event: UrlUpdateEvent) => void>>;
const NOT_WRITTEN = new URLSearchParams();

/** A desktop screen on `TODAY`, for every test of the file that calls it. */
export const setUpDesktopToday = () => {
  const { HEIGHT, WIDTH } = SCREEN.VIEWPORT.DESKTOP;
  beforeEach(async () => {
    await page.viewport(WIDTH, HEIGHT);
    vi.useFakeTimers({ now: TODAY, toFake: ["Date"] });
  });
  afterEach(() => {
    vi.useRealTimers();
  });
};

/** What the address holds after the last write. */
export const addressOf = (onUrlUpdate: UrlUpdate) =>
  onUrlUpdate.mock.lastCall?.[0].searchParams ?? NOT_WRITTEN;

/** Every query the list at `url` receives, as its search params, while the API answers `answer`. */
export const listAsked = (url: string, answer: object) => {
  const asked: URLSearchParams[] = [];
  worker.use(
    http.get(url, ({ request }) => {
      asked.push(new URL(request.url).searchParams);
      return HttpResponse.json(answer);
    })
  );
  return asked;
};

/** The list on `search`, once its table is drawn; its address writes land in `onUrlUpdate`. */
export const renderList = async ({
  children,
  list,
  search = "",
}: {
  children: ReactNode;
  list: string;
  search?: string;
}) => {
  const onUrlUpdate = vi.fn<(event: UrlUpdateEvent) => void>();
  const screen = await renderInApp({ children, onUrlUpdate, search });
  await vi.waitFor(() => screen.getByRole("table", { name: list }).element());
  return { onUrlUpdate, screen };
};

/** The controls of a list's columns and its Filter panel, by their names. */
export const listControls = (filters: string | RegExp) => {
  const header = (name: string) =>
    page.getByRole("columnheader", { name }).getByRole("button");
  return {
    /** Opens a column's menu and chooses an item of it. */
    choose: async (column: string, item: string) => {
      await userEvent.click(header(column));
      await userEvent.click(page.getByRole("menuitemcheckbox", { name: item }));
    },
    header,
    openFilters: () =>
      userEvent.click(page.getByRole("button", { name: filters })),
    panel: () => page.getByRole("dialog"),
  };
};
