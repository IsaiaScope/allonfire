// @module-tag integration
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { AOFExportActions } from "../components/aof-export-actions";
import { IMAGE } from "../constants/image";
import { restoreShare, stubShare, watchSaves } from "./stub-share";

const LABELS = { download: "Download the image", share: "Share the image" };
const HREF = `https://api.test${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id: "image-1" })}`;
const NEXT_HREF = `https://api.test${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id: "image-2" })}`;
const NAME = "2026-11-25-1a2b3c4d.jpg";
const NEXT_NAME = "2026-11-25-9f8e7d6c.jpg";
const PHONE_PX = 320;

const answers = () =>
  vi.fn(
    async () =>
      new Response(new Blob(["jpeg-bytes"]), { status: HTTP.STATUS.OK })
  );

afterEach(() => {
  vi.restoreAllMocks();
  restoreShare();
  vi.unstubAllGlobals();
});

const silent = () => ({
  onDownloadFailed: vi.fn(),
  onGone: vi.fn(),
  onShareFailed: vi.fn(),
  onShareReady: vi.fn(),
});

/** The same controls once the page shows its next Image. */
const nextExport = (handlers: ReturnType<typeof silent>) => (
  <AOFExportActions
    exportUrl={NEXT_HREF}
    fileName={NEXT_NAME}
    labels={LABELS}
    {...handlers}
  />
);

/** Lets an answer settle before looking for calls that must not come. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));

const renderActions = (
  props: Partial<Parameters<typeof AOFExportActions>[0]> = {}
) =>
  render(
    <AOFExportActions
      exportUrl={HREF}
      fileName={NAME}
      labels={LABELS}
      {...silent()}
      {...props}
    />
  );

/** A `fetch` that answers only once the test says so. */
const holdFetch = () => {
  let release: () => void = () => undefined;
  const held = new Promise<void>((resolve) => {
    release = resolve;
  });
  const request = vi.fn(async (_url: string, _init?: RequestInit) => {
    await held;
    return new Response(new Blob(["jpeg-bytes"]), { status: HTTP.STATUS.OK });
  });
  vi.stubGlobal("fetch", request);
  return { release: () => release(), request };
};

const shareButton = () => page.getByRole("button", { name: LABELS.share });
const downloadButton = () =>
  page.getByRole("button", { name: LABELS.download });

describe("AOFExportActions on an Image that is no longer there", () => {
  it.for([{ control: LABELS.download }, { control: LABELS.share }])(
    "$control says it is gone, not that it failed",
    async ({ control }) => {
      const share = stubShare({ canShare: () => true });
      const saved = watchSaves();
      vi.stubGlobal(
        "fetch",
        vi.fn(async () => new Response(null, { status: HTTP.STATUS.NOT_FOUND }))
      );
      const handlers = silent();
      await renderActions(handlers);
      await page.getByRole("button", { name: control }).click();
      await vi.waitFor(() => expect(handlers.onGone).toHaveBeenCalledOnce());
      await settle();
      expect(handlers.onDownloadFailed).not.toHaveBeenCalled();
      expect(handlers.onShareFailed).not.toHaveBeenCalled();
      expect(share).not.toHaveBeenCalled();
      expect(saved).toEqual([]);
    }
  );
});

describe("AOFExportActions Download", () => {
  it("gets the Export with the Session, then saves it under its name", async () => {
    stubShare({ canShare: undefined });
    const saved = watchSaves();
    const request = answers();
    vi.stubGlobal("fetch", request);
    const onDownloadFailed = vi.fn();
    await renderActions({ onDownloadFailed });
    await downloadButton().click();
    await expect.poll(() => saved.length).toBe(1);
    expect(request).toHaveBeenCalledWith(
      HREF,
      expect.objectContaining({ credentials: "include" })
    );
    expect(saved[0]?.name).toBe(NAME);
    // The file itself, never the API's address: a link there leaves the App.
    expect(saved[0]?.href.startsWith("blob:")).toBe(true);
    expect(onDownloadFailed).not.toHaveBeenCalled();
  });

  it("saves nothing and says so when the API refuses, never leaving the page", async () => {
    stubShare({ canShare: undefined });
    const saved = watchSaves();
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response("{}", { status: HTTP.STATUS.TOO_MANY_REQUESTS })
      )
    );
    const onDownloadFailed = vi.fn();
    await renderActions({ onDownloadFailed });
    expect(
      page.getByRole("link", { name: LABELS.download }).elements()
    ).toHaveLength(0);
    await downloadButton().click();
    await expect.poll(() => onDownloadFailed.mock.calls.length).toBe(1);
    expect(saved).toHaveLength(0);
  });

  it("runs one Export at a time, Share included", async () => {
    stubShare({ canShare: () => true });
    const saved = watchSaves();
    const { release, request } = holdFetch();
    await renderActions();
    await downloadButton().click();
    await expect.element(downloadButton()).toBeDisabled();
    await expect.element(shareButton()).toBeDisabled();
    release();
    await expect.element(downloadButton()).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(1);
    expect(saved).toHaveLength(1);
  });

  it("frees the saved file's address a while later, even once it is gone from the page", async () => {
    stubShare({ canShare: undefined });
    const saved = watchSaves();
    const freed = vi.spyOn(URL, "revokeObjectURL");
    const later = vi.spyOn(globalThis, "setTimeout");
    vi.stubGlobal("fetch", answers());
    const { unmount } = await renderActions();
    await downloadButton().click();
    await expect.poll(() => saved.length).toBe(1);
    await unmount();
    const free = later.mock.calls.find(
      ([, ms]) => ms === IMAGE.EXPORT.REVOKE_AFTER_MS
    )?.[0];
    expect(freed).not.toHaveBeenCalled();
    if (typeof free === "function") {
      free();
    }
    expect(freed).toHaveBeenCalledExactlyOnceWith(saved[0]?.href);
  });

  it("saves nothing once it is gone from the page", async () => {
    stubShare({ canShare: undefined });
    const saved = watchSaves();
    const { release, request } = holdFetch();
    const onDownloadFailed = vi.fn();
    const { unmount } = await renderActions({ onDownloadFailed });
    await downloadButton().click();
    await unmount();
    // The transfer itself stops: nothing keeps arriving behind a closed page.
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    release();
    await settle();
    expect(saved).toHaveLength(0);
    expect(onDownloadFailed).not.toHaveBeenCalled();
  });
});

describe("AOFExportActions Share", () => {
  it("is not there when the browser cannot send files", async () => {
    stubShare({ canShare: () => false });
    await renderActions();
    await expect.element(shareButton()).not.toBeInTheDocument();
    await expect.element(downloadButton()).toBeInTheDocument();
  });

  it("is not there when the browser has no canShare", async () => {
    stubShare({ canShare: undefined });
    await renderActions();
    await expect.element(shareButton()).not.toBeInTheDocument();
  });

  it("is there from the first paint when the browser can", async () => {
    stubShare({ canShare: () => true });
    const { container } = await renderActions();
    // No waiting: it must not pop in after the first render.
    expect(
      container.querySelector(`[aria-label="${LABELS.share}"]`)
    ).not.toBeNull();
  });

  it("drops the one under way when the Export on screen changes, and is free for the new one", async () => {
    const share = stubShare({ canShare: () => true });
    const { release, request } = holdFetch();
    const handlers = silent();
    const { rerender } = await renderActions(handlers);
    await shareButton().click();
    await expect.element(shareButton()).toBeDisabled();
    await rerender(nextExport(handlers));
    await expect.element(shareButton()).toBeEnabled();
    await expect.element(downloadButton()).toBeEnabled();
    release();
    await settle();
    expect(request.mock.calls[0]?.[1]?.signal?.aborted).toBe(true);
    expect(share).not.toHaveBeenCalled();
    expect(handlers.onShareFailed).not.toHaveBeenCalled();
    expect(handlers.onShareReady).not.toHaveBeenCalled();
    await shareButton().click();
    await expect.poll(() => share.mock.calls.length).toBe(1);
    const [data] = share.mock.calls[0] ?? [];
    expect(data?.files?.[0]?.name).toBe(NEXT_NAME);
    expect(data?.files?.[0]?.type).toBe(STORED_IMAGE.EXPORT.CONTENT_TYPE);
  });

  it("takes no second press while one share is under way", async () => {
    const share = stubShare({ canShare: () => true });
    const { release, request } = holdFetch();
    await renderActions();
    await shareButton().click();
    await expect.element(shareButton()).toBeDisabled();
    const button = shareButton().element();
    if (button instanceof HTMLElement) {
      button.click();
    }
    release();
    await expect.element(shareButton()).toBeEnabled();
    expect(request).toHaveBeenCalledTimes(1);
    expect(share).toHaveBeenCalledTimes(1);
  });

  it("shares nothing once it is gone from the page", async () => {
    const share = stubShare({ canShare: () => true });
    const { release, request } = holdFetch();
    const onShareFailed = vi.fn();
    const { unmount } = await renderActions({ onShareFailed });
    await shareButton().click();
    await unmount();
    release();
    await settle();
    expect(request).toHaveBeenCalledTimes(1);
    expect(share).not.toHaveBeenCalled();
    expect(onShareFailed).not.toHaveBeenCalled();
  });

  it("says so when sharing failed", async () => {
    stubShare({ canShare: () => true });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("", { status: HTTP.STATUS.UNAUTHORIZED }))
    );
    const onShareFailed = vi.fn();
    await renderActions({ onShareFailed });
    await shareButton().click();
    await expect.poll(() => onShareFailed.mock.calls.length).toBe(1);
  });

  it("stays silent when the person closes the share sheet", async () => {
    const share = stubShare({
      canShare: () => true,
      share: () =>
        Promise.reject(new DOMException("closed", IMAGE.EXPORT.ABORT_ERROR)),
    });
    vi.stubGlobal("fetch", answers());
    const onShareFailed = vi.fn();
    await renderActions({ onShareFailed });
    await shareButton().click();
    await expect.poll(() => share.mock.calls.length).toBe(1);
    await settle();
    expect(onShareFailed).not.toHaveBeenCalled();
  });
});

/** A browser that refuses the sheet the first `times`, as iOS does once the tap is too old. */
const refusesSheet = (times: number) => {
  let left = times;
  return stubShare({
    canShare: () => true,
    share: () => {
      left -= 1;
      return left >= 0
        ? Promise.reject(
            new DOMException("too late", IMAGE.EXPORT.NOT_ALLOWED_ERROR)
          )
        : Promise.resolve();
    },
  });
};

/** The controls after a first Share that ended too late for its tap. */
const pressedTooLate = async (refusals: number) => {
  const share = refusesSheet(refusals);
  const request = answers();
  vi.stubGlobal("fetch", request);
  const handlers = silent();
  const screen = await renderActions(handlers);
  await shareButton().click();
  // Ready, and free for the next press.
  await vi.waitUntil(
    () =>
      handlers.onShareReady.mock.calls.length === 1 &&
      shareButton().element().getAttribute("aria-disabled") !== "true"
  );
  return { handlers, request, share, ...screen };
};

describe("AOFExportActions Share on a slow connection", () => {
  it("keeps the file, says it is ready, and shares it inside the next tap without fetching again", async () => {
    const { handlers, request, share } = await pressedTooLate(1);
    const button = shareButton().element();
    if (button instanceof HTMLElement) {
      button.click();
    }
    // No waiting: a sheet asked for later than the tap is refused again.
    expect(share).toHaveBeenCalledTimes(2);
    expect(share.mock.calls[1]?.[0].files?.[0]).toBe(
      share.mock.calls[0]?.[0].files?.[0]
    );
    expect(request).toHaveBeenCalledTimes(1);
    expect(handlers.onShareFailed).not.toHaveBeenCalled();
  });

  it("says it failed when the next tap is refused too, and fetches afresh after that", async () => {
    const { handlers, request, share } = await pressedTooLate(2);
    await shareButton().click();
    await expect.poll(() => handlers.onShareFailed.mock.calls.length).toBe(1);
    expect(handlers.onShareReady).toHaveBeenCalledTimes(1);
    await shareButton().click();
    await expect.poll(() => share.mock.calls.length).toBe(3);
    expect(request).toHaveBeenCalledTimes(2);
  });

  it("forgets the kept file when the Export on screen changes", async () => {
    const { handlers, request, rerender, share } = await pressedTooLate(1);
    await rerender(nextExport(handlers));
    await shareButton().click();
    await expect.poll(() => share.mock.calls.length).toBe(2);
    expect(share.mock.calls[1]?.[0].files?.[0]?.name).toBe(NEXT_NAME);
    expect(request).toHaveBeenCalledTimes(2);
  });
});

describe("AOFExportActions keyboard and fit", () => {
  it("leaves both controls in the tab order and shares with Enter", async () => {
    const share = stubShare({ canShare: () => true });
    vi.stubGlobal("fetch", answers());
    await renderActions();
    downloadButton().element().focus();
    await userEvent.keyboard("{Tab}");
    expect(document.activeElement).toBe(shareButton().element());
    await userEvent.keyboard("{Enter}");
    await expect.poll(() => share.mock.calls.length).toBe(1);
  });

  it("keeps both icon buttons inside a 320px container", async () => {
    stubShare({ canShare: () => true });
    const { container } = await render(
      <div data-testid="frame" style={{ width: PHONE_PX }}>
        <AOFExportActions
          exportUrl={HREF}
          fileName={NAME}
          labels={LABELS}
          {...silent()}
        />
      </div>
    );
    const frame = container
      .querySelector<HTMLElement>('[data-testid="frame"]')
      ?.getBoundingClientRect();
    const controls = [downloadButton().element(), shareButton().element()].map(
      (control) => control.getBoundingClientRect()
    );
    for (const box of controls) {
      expect(box.left).toBeGreaterThanOrEqual(frame?.left ?? 0);
      expect(box.right).toBeLessThanOrEqual(frame?.right ?? 0);
    }
  });
});
