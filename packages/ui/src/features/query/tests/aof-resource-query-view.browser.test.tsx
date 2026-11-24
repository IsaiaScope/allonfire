// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { notFound } from "next/navigation";
import { page } from "vitest/browser";
import { renderInUi } from "../../../shared/tests/render-in-ui";
import { STUB_ACTIONS, StubFrame } from "../../feedback/tests/notice-stub";
import { AOFResourceQueryView } from "../components/aof-resource-query-view";

vi.mock("next/navigation", () => ({ notFound: vi.fn() }));

const refetch = vi.fn();
/** An error as the API client raises one: it carries the answer's status. */
const refusedWith = (statusCode: number) =>
  Object.assign(new Error("refused"), { statusCode });

const view = (query: { data: string | undefined; error: unknown }) =>
  renderInUi({
    children: (
      <AOFResourceQueryView
        actions={STUB_ACTIONS}
        Frame={StubFrame}
        loading={<p>The form's skeleton</p>}
        query={{ ...query, refetch }}
      >
        {(data: string) => <p>{data}</p>}
      </AOFResourceQueryView>
    ),
    messages: {},
  });

beforeEach(() => {
  refetch.mockClear();
  vi.mocked(notFound).mockClear();
});

describe("AOFResourceQueryView", () => {
  it("draws the resource once it is read", async () => {
    await view({ data: "The sea", error: null });
    await expect.element(page.getByText("The sea")).toBeVisible();
  });

  it("shows the page's own loading node while nothing is read yet", async () => {
    await view({ data: undefined, error: null });
    await expect.element(page.getByText("The form's skeleton")).toBeVisible();
  });

  it("is the 404 for a resource the API does not know", async () => {
    await view({
      data: undefined,
      error: refusedWith(HTTP.STATUS.NOT_FOUND),
    });
    await vi.waitFor(() => expect(notFound).toHaveBeenCalled());
  });

  it("shows the notice in the App's frame for any other refusal, its retry asking again", async () => {
    await view({
      data: undefined,
      error: refusedWith(HTTP.STATUS.INTERNAL_SERVER_ERROR),
    });
    await expect.element(page.getByText("RETRY")).toBeVisible();
    await page.getByRole("button").click();
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
