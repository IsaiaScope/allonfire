// @module-tag unit
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { fillPath } from "@allonfire/core/shared/utils/route-path";
import { IMAGE as STORED_IMAGE } from "@allonfire/storage/features/image/constants/image";
import { STORAGE } from "@allonfire/storage/shared/constants/paths";
import { IMAGE } from "../constants/image";
import {
  canShareExport,
  downloadExport,
  prepareExport,
  shareFile,
} from "../utils/send-export";

const { RESULT } = IMAGE.EXPORT;
const URL_OF_EXPORT = `https://api.test${STORAGE.PATH.IMAGES}${fillPath(STORAGE.PATH.EXPORT, { id: "image-1" })}`;
const NAME = "2026-11-25-1a2b3c4d.jpg";

const abort = () => new DOMException("cancelled", IMAGE.EXPORT.ABORT_ERROR);

/** A browser whose share sheet does what the test says. */
const browser = ({
  canShare = () => true,
  share = () => Promise.resolve(),
}: {
  canShare?: ((data: ShareData) => boolean) | undefined;
  share?: (data: ShareData) => Promise<void>;
} = {}) => {
  const shareSpy = vi.fn(share);
  const canShareSpy = vi.fn(canShare);
  vi.stubGlobal("navigator", { canShare: canShareSpy, share: shareSpy });
  return { canShare: canShareSpy, share: shareSpy };
};

const answer = (status: number = HTTP.STATUS.OK) =>
  vi.fn(async () => new Response(new Blob(["jpeg-bytes"]), { status }));

// Node has no `reportError`, a browser global.
beforeEach(() => {
  vi.stubGlobal("reportError", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("canShareExport", () => {
  it("is false when the browser has no canShare", () => {
    vi.stubGlobal("navigator", {});
    expect(canShareExport()).toBe(false);
  });

  it("is false when the browser says it cannot send that file", () => {
    browser({ canShare: () => false });
    expect(canShareExport()).toBe(false);
  });

  it("asks about a JPEG file, and is true when the browser says yes", () => {
    const { canShare } = browser();
    expect(canShareExport()).toBe(true);
    const [data] = canShare.mock.calls[0] ?? [];
    expect(data?.files).toHaveLength(1);
    expect(data?.files?.[0]?.type).toBe(STORED_IMAGE.EXPORT.CONTENT_TYPE);
  });
});

describe("prepareExport", () => {
  it("fetches the Export with the Session as one named JPEG file", async () => {
    const fetchExport = answer();
    vi.stubGlobal("fetch", fetchExport);
    const file = await prepareExport(URL_OF_EXPORT, NAME);
    expect(fetchExport).toHaveBeenCalledWith(URL_OF_EXPORT, {
      credentials: "include",
    });
    expect.assert(file instanceof File);
    expect(file.name).toBe(NAME);
    expect(file.type).toBe(STORED_IMAGE.EXPORT.CONTENT_TYPE);
  });

  it("is null on an answer that is not ok", async () => {
    vi.stubGlobal("fetch", answer(HTTP.STATUS.UNAUTHORIZED));
    expect(await prepareExport(URL_OF_EXPORT, NAME)).toBeNull();
  });

  it("is gone, not just refused, when the Image is no longer there", async () => {
    vi.stubGlobal("fetch", answer(HTTP.STATUS.NOT_FOUND));
    expect(await prepareExport(URL_OF_EXPORT, NAME)).toBe(RESULT.GONE);
  });

  it("is null when the request itself fails, reporting it and never throwing", async () => {
    const offline = new TypeError("offline");
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(offline))
    );
    expect(await prepareExport(URL_OF_EXPORT, NAME)).toBeNull();
    expect(reportError).toHaveBeenCalledWith(offline);
  });

  it("is null once its signal is aborted, with nothing reported", async () => {
    vi.stubGlobal("fetch", answer());
    const gone = new AbortController();
    gone.abort();
    expect(await prepareExport(URL_OF_EXPORT, NAME, gone.signal)).toBeNull();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => Promise.reject(abort()))
    );
    expect(await prepareExport(URL_OF_EXPORT, NAME)).toBeNull();
    expect(reportError).not.toHaveBeenCalled();
  });
});

describe("downloadExport", () => {
  it("is cancelled, not failed, once its signal is aborted, saving nothing", async () => {
    vi.stubGlobal("fetch", answer());
    const gone = new AbortController();
    gone.abort();
    // Node has no `document`: saving would throw here.
    expect(await downloadExport(URL_OF_EXPORT, NAME, gone.signal)).toBe(
      RESULT.CANCELLED
    );
  });

  it("is gone when the Image is no longer there", async () => {
    vi.stubGlobal("fetch", answer(HTTP.STATUS.NOT_FOUND));
    expect(await downloadExport(URL_OF_EXPORT, NAME)).toBe(RESULT.GONE);
  });

  it("is failed on an answer that is not ok", async () => {
    vi.stubGlobal("fetch", answer(HTTP.STATUS.TOO_MANY_REQUESTS));
    expect(await downloadExport(URL_OF_EXPORT, NAME)).toBe(RESULT.FAILED);
  });
});

describe("shareFile", () => {
  const file = new File(["jpeg-bytes"], NAME, {
    type: STORED_IMAGE.EXPORT.CONTENT_TYPE,
  });

  it("hands the sheet the file only: no link, no title, no text", async () => {
    const { share } = browser();
    expect(await shareFile(file)).toBe(RESULT.DONE);
    expect(share).toHaveBeenCalledExactlyOnceWith({ files: [file] });
  });

  it("opens the sheet at once, still inside the tap that called it", async () => {
    const { share } = browser();
    const sharing = shareFile(file);
    expect(share).toHaveBeenCalledOnce();
    await sharing;
  });

  it("is cancelled, not failed, when the person closes the share sheet", async () => {
    browser({ share: () => Promise.reject(abort()) });
    expect(await shareFile(file)).toBe(RESULT.CANCELLED);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("is blocked, unreported, when the browser wants a new tap first", async () => {
    browser({
      share: () =>
        Promise.reject(
          new DOMException("no activation", IMAGE.EXPORT.NOT_ALLOWED_ERROR)
        ),
    });
    expect(await shareFile(file)).toBe(RESULT.BLOCKED);
    expect(reportError).not.toHaveBeenCalled();
  });

  it("fails on anything else the sheet throws, and reports it", async () => {
    const broken = new TypeError("broken");
    browser({ share: () => Promise.reject(broken) });
    expect(await shareFile(file)).toBe(RESULT.FAILED);
    expect(reportError).toHaveBeenCalledWith(broken);
  });

  it("fails without opening the sheet when canShare now says no", async () => {
    const { share } = browser({ canShare: () => false });
    expect(await shareFile(file)).toBe(RESULT.FAILED);
    expect(share).not.toHaveBeenCalled();
  });
});
