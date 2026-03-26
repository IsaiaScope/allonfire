// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { usePublishWizard } from "./use-publish-wizard";

const revokeObjectURL = vi.fn();
globalThis.URL.revokeObjectURL = revokeObjectURL;

const mockFile = (name: string) =>
  new File(["test"], name, { type: "image/png" });

describe("usePublishWizard", () => {
  beforeEach(() => {
    revokeObjectURL.mockClear();
  });

  it("initializes with compose step and empty state", () => {
    const { result } = renderHook(() => usePublishWizard());

    expect(result.current.state).toEqual({
      step: "compose",
      originalContent: "",
      imageFiles: [],
      imagePreviewUrls: [],
      selectedPlatforms: [],
      platformContents: [],
      results: [],
      loadingPhase: "idle",
    });
  });

  it("SET_CONTENT updates originalContent", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.setContent("Hello world");
    });

    expect(result.current.state.originalContent).toBe("Hello world");
  });

  it("TOGGLE_PLATFORM adds and removes platform", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.togglePlatform("TWITTER");
    });
    expect(result.current.state.selectedPlatforms).toContain("TWITTER");

    act(() => {
      result.current.actions.togglePlatform("TWITTER");
    });
    expect(result.current.state.selectedPlatforms).not.toContain("TWITTER");
  });

  it("ADD_IMAGES appends to existing", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.addImages(
        [mockFile("a.png"), mockFile("b.png")],
        ["blob:url-1", "blob:url-2"]
      );
    });
    expect(result.current.state.imageFiles).toHaveLength(2);

    act(() => {
      result.current.actions.addImages([mockFile("c.png")], ["blob:url-3"]);
    });
    expect(result.current.state.imageFiles).toHaveLength(3);
    expect(result.current.state.imagePreviewUrls).toHaveLength(3);
  });

  it("REMOVE_IMAGE removes at index and revokes URL", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.addImages(
        [mockFile("a.png"), mockFile("b.png"), mockFile("c.png")],
        ["blob:url-1", "blob:url-2", "blob:url-3"]
      );
    });

    act(() => {
      result.current.actions.removeImage(1);
    });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url-2");
    expect(result.current.state.imageFiles).toHaveLength(2);
    expect(result.current.state.imagePreviewUrls).toEqual([
      "blob:url-1",
      "blob:url-3",
    ]);
  });

  it("REORDER_IMAGES replaces both arrays", () => {
    const { result } = renderHook(() => usePublishWizard());
    const fileA = mockFile("a.png");
    const fileB = mockFile("b.png");

    act(() => {
      result.current.actions.addImages(
        [fileA, fileB],
        ["blob:url-1", "blob:url-2"]
      );
    });

    act(() => {
      result.current.actions.reorderImages(
        [fileB, fileA],
        ["blob:url-2", "blob:url-1"]
      );
    });

    expect(result.current.state.imageFiles).toEqual([fileB, fileA]);
    expect(result.current.state.imagePreviewUrls).toEqual([
      "blob:url-2",
      "blob:url-1",
    ]);
  });

  it("SET_LOADING_PHASE transitions", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.setElaborating(true);
    });
    expect(result.current.state.loadingPhase).toBe("elaborating");

    act(() => {
      result.current.actions.setElaborating(false);
    });
    expect(result.current.state.loadingPhase).toBe("idle");
  });

  it("RESET revokes all URLs and returns to initial", () => {
    const { result } = renderHook(() => usePublishWizard());

    act(() => {
      result.current.actions.addImages(
        [mockFile("a.png"), mockFile("b.png")],
        ["blob:url-1", "blob:url-2"]
      );
      result.current.actions.togglePlatform("TWITTER");
      result.current.actions.setContent("Some content");
    });

    act(() => {
      result.current.actions.reset();
    });

    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url-1");
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:url-2");
    expect(result.current.state).toEqual({
      step: "compose",
      originalContent: "",
      imageFiles: [],
      imagePreviewUrls: [],
      selectedPlatforms: [],
      platformContents: [],
      results: [],
      loadingPhase: "idle",
    });
  });
});
