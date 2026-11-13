// @module-tag integration

import { HTTP } from "@allonfire/core/features/http/constants/http";
import { SHARED_TRANSLATIONS } from "@allonfire/core/features/next/i18n/translations/shared-translations";
import { DetailedError } from "hono/client";
import { notFound } from "next/navigation";
import { page } from "vitest/browser";
import { renderInApp } from "@/shared/tests/render-in-app";
import { ResourceView } from "../resource-view";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

const ERROR = SHARED_TRANSLATIONS.en.Common.Error;
const refetch = vi.fn();
const detailed = (statusCode: number) =>
  new DetailedError("refused", { statusCode });

const view = (query: { data: string | undefined; error: unknown }) =>
  renderInApp({
    children: (
      <ResourceView query={{ ...query, refetch }}>
        {(data) => <p>{data}</p>}
      </ResourceView>
    ),
  });

beforeEach(() => {
  refetch.mockClear();
  vi.mocked(notFound).mockClear();
});

describe("ResourceView", () => {
  it("draws the resource once it is read", async () => {
    view({ data: "The sea", error: null });
    await expect.element(page.getByText("The sea")).toBeVisible();
  });

  // A refetch that fails (the resource deleted by this very page) must not
  // pull the form away.
  it("keeps drawing the resource when a later read fails", async () => {
    view({ data: "The sea", error: detailed(HTTP.STATUS.NOT_FOUND) });
    await expect.element(page.getByText("The sea")).toBeVisible();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("waits with the page's loading screen while nothing is read yet", async () => {
    view({ data: undefined, error: null });
    await expect
      .element(page.getByRole("status"))
      .toHaveTextContent(SHARED_TRANSLATIONS.en.Common.Loading.label);
  });

  it("waits with a screen of its own when the page gives one", async () => {
    renderInApp({
      children: (
        <ResourceView
          loading={<p>The form's skeleton</p>}
          query={{ data: undefined, error: null, refetch }}
        >
          {(data: string) => <p>{data}</p>}
        </ResourceView>
      ),
    });
    await expect.element(page.getByText("The form's skeleton")).toBeVisible();
    await expect.element(page.getByRole("status")).not.toBeInTheDocument();
  });

  it("is the 404 for a resource the API does not know", async () => {
    view({ data: undefined, error: detailed(HTTP.STATUS.NOT_FOUND) });
    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("shows the error notice, with a retry, for any other refusal", async () => {
    view({ data: undefined, error: detailed(HTTP.STATUS.FORBIDDEN) });
    await expect.element(page.getByText(ERROR.title)).toBeVisible();
    expect(notFound).not.toHaveBeenCalled();
    await page.getByRole("button", { name: ERROR.retry }).click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
