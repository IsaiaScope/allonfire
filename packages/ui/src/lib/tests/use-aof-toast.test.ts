// @module-tag unit
import { isValidElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { toast } from "sonner";
import { AOF_TOAST, aofToast } from "../use-aof-toast";

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), info: vi.fn(), success: vi.fn(), warning: vi.fn() },
}));

describe("aofToast", () => {
  it("keeps a failure and a warning on screen longer", () => {
    aofToast("Not saved", "error");
    aofToast("Almost full", "warning");
    expect(toast.error).toHaveBeenCalledWith(expect.anything(), {
      id: "error:Not saved",
      ...AOF_TOAST.NEEDS_READING,
    });
    expect(toast.warning).toHaveBeenCalledWith(expect.anything(), {
      id: "warning:Almost full",
      ...AOF_TOAST.NEEDS_READING,
    });
  });

  it("leaves a success and a fact at Sonner's own time", () => {
    aofToast("Saved", "success");
    aofToast("Synced", "info");
    expect(toast.success).toHaveBeenCalledWith(expect.anything(), {
      id: "success:Saved",
    });
    expect(toast.info).toHaveBeenCalledWith(expect.anything(), {
      id: "info:Synced",
    });
  });

  it("sends the words selectable, with the text caret", () => {
    vi.clearAllMocks();
    aofToast("Not saved", "error");
    const [words] = vi.mocked(toast.error).mock.calls[0] ?? [];
    if (!isValidElement(words)) {
      throw new Error("aofToast sent no element");
    }
    expect(renderToStaticMarkup(words)).toBe(
      '<span class="cursor-text select-text">Not saved</span>'
    );
  });

  it("puts a description under the message, selectable too", () => {
    vi.clearAllMocks();
    aofToast("Not saved", "error", {
      description: "The server did not answer.",
    });
    const [, options] = vi.mocked(toast.error).mock.calls[0] ?? [];
    const description = options?.description;
    if (!isValidElement(description)) {
      throw new Error("aofToast sent no description element");
    }
    expect(renderToStaticMarkup(description)).toBe(
      '<span class="cursor-text select-text">The server did not answer.</span>'
    );
    expect(options?.id).toBe("error:Not saved:The server did not answer.");
  });

  it("passes any of Sonner's options through, over its own", () => {
    vi.clearAllMocks();
    aofToast("Saved", "success", { duration: 1000, id: "saved" });
    expect(toast.success).toHaveBeenCalledWith(expect.anything(), {
      duration: 1000,
      id: "saved",
    });
  });

  it("sends the same words of the same kind as one toast", () => {
    vi.clearAllMocks();
    aofToast("Not saved", "error");
    aofToast("Not saved", "error");
    aofToast("Not saved", "warning");
    const ids = [
      ...vi.mocked(toast.error).mock.calls,
      ...vi.mocked(toast.warning).mock.calls,
    ].map(([, options]) => options?.id);
    expect(new Set(ids)).toEqual(
      new Set(["error:Not saved", "warning:Not saved"])
    );
  });
});
