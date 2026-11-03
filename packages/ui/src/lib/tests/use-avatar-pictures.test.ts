// @module-tag unit
import { canDraw } from "../crop-image";
import { heicToJpeg } from "../heic-to-jpeg";
import { useCropPictures } from "../use-avatar-pictures";

vi.mock("../heic-to-jpeg", () => ({ heicToJpeg: vi.fn() }));
vi.mock("../crop-image", () => ({ canDraw: vi.fn() }));
// No DOM here: the hook is called outside a render, its state never kept.
vi.mock("react", async (original) => ({
  ...(await original<typeof import("react")>()),
  useCallback: <T>(callback: T) => callback,
  useEffect: () => undefined,
  useState: <T>(initial: T) => [initial, () => undefined],
}));

const HEIC = new File(["x"], "IMG_0001.HEIC", { type: "image/heic" });

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useCropPictures' pick", () => {
  it("still tells unreadable when the HEIC conversion fails, and reports why", async () => {
    const failure = new Error("conversion failed");
    const reportError = vi.fn();
    vi.stubGlobal("reportError", reportError);
    vi.mocked(heicToJpeg).mockRejectedValueOnce(failure);
    const onUnreadable = vi.fn();

    expect(await useCropPictures(onUnreadable).pick(HEIC)).toBe(false);

    expect(onUnreadable).toHaveBeenCalledOnce();
    expect(reportError).toHaveBeenCalledWith(failure);
    expect(canDraw).not.toHaveBeenCalled();
  });
});
