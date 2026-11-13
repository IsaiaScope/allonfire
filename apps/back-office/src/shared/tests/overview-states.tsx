import { worker } from "@allonfire/config/tests/browser/msw";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { SCREEN } from "@allonfire/core/shared/constants/screens";
import { delay, HttpResponse, http } from "msw";
import type { ReactElement } from "react";
import { page } from "vitest/browser";
import { ACTION_KANJI } from "@/shared/constants/action-kanji";
import { renderInApp } from "@/shared/tests/render-in-app";

/** Long enough for the one retry a server failure gets. */
const SETTLE_MS = 5000;

/** The words an overview card says in each state: its Feature's own translations. */
type OverviewWords = {
  chart: { label: string };
  error: { forbidden: string; retry: string; view: string };
};

type OverviewSetup = {
  /** What the API answers when it all goes well. */
  loaded: object;
  /** The describe titles' prefix: the view's name. */
  name: string;
  t: OverviewWords;
  url: string;
  view: ReactElement;
};

/**
 * What the Overview cards of the Back Office share: the providers they render
 * in, the answers MSW gives them, and the tests of their refusals and their
 * skeleton, all registered here. The viewport is set to the desktop's for the
 * whole file that calls it.
 */
export const setupOverview = ({
  loaded,
  name,
  t,
  url,
  view,
}: OverviewSetup) => {
  const renderView = () => renderInApp({ children: view });

  const answer = (body: object, status: number = HTTP.STATUS.OK) =>
    worker.use(http.get(url, () => HttpResponse.json(body, { status })));

  /** The height of the card once the overview settles: loaded (no `status`) or as the API answered. */
  const cardHeight = async (status?: number) => {
    if (status) {
      answer({}, status);
    }
    const screen = await renderView();
    await vi.waitFor(() => {
      if (
        screen.container.querySelector("[data-skeleton]") ||
        !screen.container.querySelector('[data-slot="card"]')
      ) {
        throw new Error("The overview has not settled yet.");
      }
    }, SETTLE_MS);
    const height =
      screen.container
        .querySelector('[data-slot="card"]')
        ?.getBoundingClientRect().height ?? 0;
    await screen.unmount();
    return height;
  };

  beforeEach(() =>
    page.viewport(SCREEN.VIEWPORT.DESKTOP.WIDTH, SCREEN.VIEWPORT.DESKTOP.HEIGHT)
  );

  describe(`${name} refusals`, () => {
    it("draws a card that says so, and no toast, when the API refuses the visitor", async () => {
      let asked = 0;
      worker.use(
        http.get(url, () => {
          asked += 1;
          return HttpResponse.json({}, { status: HTTP.STATUS.FORBIDDEN });
        })
      );
      const screen = await renderView();
      await expect.poll(() => asked).toBe(1);
      await expect.element(screen.getByText(t.error.forbidden)).toBeVisible();
      expect(
        screen.container.querySelector('[data-slot="card"]')
      ).not.toBeNull();
      expect(screen.container.querySelector("[data-skeleton]")).toBeNull();
      expect(screen.container.textContent).not.toContain(t.error.view);
      expect(document.body.textContent).not.toContain(
        SHARED_TRANSLATIONS.en.Common.Request.failed
      );
    });

    it("offers a retry in a card when the overview could not be read at all", async () => {
      answer({}, HTTP.STATUS.INTERNAL_SERVER_ERROR);
      const screen = await renderView();
      await expect.element(screen.getByText(t.error.view)).toBeVisible();
      const retry = screen.getByRole("button", { name: t.error.retry });
      await expect.element(retry).toBeVisible();
      await expect.element(retry).toHaveTextContent(ACTION_KANJI.RETRY);
      expect(
        screen.container.querySelector('[data-slot="card"]')
      ).not.toBeNull();
    });

    it.each([
      ["cannot be read", HTTP.STATUS.INTERNAL_SERVER_ERROR],
      ["is refused", HTTP.STATUS.FORBIDDEN],
    ])(
      "keeps its card as tall as the loaded one when it %s",
      async (_case, status) => {
        expect(
          Math.abs((await cardHeight(status)) - (await cardHeight()))
        ).toBeLessThan(3);
      }
    );
  });

  describe(`${name} skeleton`, () => {
    it("is as tall as the card it stands for, so nothing moves when the data arrives", async () => {
      worker.use(
        http.get(url, async () => {
          await delay(150);
          return HttpResponse.json(loaded);
        })
      );
      const screen = await renderView();
      const skeleton = screen.container.querySelector("[data-skeleton]");
      const waiting = skeleton?.getBoundingClientRect().height ?? 0;
      await expect
        .element(screen.getByRole("img", { name: t.chart.label }))
        .toBeVisible();
      const card = screen.container.querySelector('[data-slot="card"]');
      expect(waiting).toBeGreaterThan(0);
      expect(
        Math.abs((card?.getBoundingClientRect().height ?? 0) - waiting)
      ).toBeLessThan(2);
    });
  });

  /** Renders the view: the screen and the locator of its chart. */
  const renderChart = async () => {
    const screen = await renderView();
    return { chart: screen.getByRole("img", { name: t.chart.label }), screen };
  };

  return { answer, renderChart, renderView };
};
