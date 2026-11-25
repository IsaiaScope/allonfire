// @module-tag integration

import { page, userEvent } from "vitest/browser";
import { aofToast } from "../../../../shared/hooks/use-aof-toast";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import { AOFImageDropzone } from "../components/aof-image-dropzone";
import { uploadCopy } from "./image-upload-copy";

vi.mock("../../../../shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("../../../../shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const text = () => new File(["x"], "notes.txt", { type: "text/plain" });

const show = (props: { disabled?: boolean } = {}) => {
  const pick = vi.fn();
  renderInUi({
    children: <AOFImageDropzone pick={pick} {...props} />,
    messages: {},
  });
  return pick;
};
const area = () => page.getByRole("region", { name: uploadCopy("pick.input") });
/** A drop of `files` on the area, as a browser delivers it. */
const drop = (files: File[]) => {
  const data = new DataTransfer();
  for (const file of files) {
    data.items.add(file);
  }
  area()
    .element()
    .dispatchEvent(
      new DragEvent("drop", {
        bubbles: true,
        cancelable: true,
        dataTransfer: data,
      })
    );
};

beforeEach(() => {
  vi.mocked(aofToast).mockClear();
});

describe("AOFImageDropzone", () => {
  it("is named by the picker's words and is a tab stop", async () => {
    show();
    await expect.element(area()).toBeVisible();
    await userEvent.tab();
    await expect.element(area()).toHaveFocus();
  });

  it("says what it takes, the picture types and its button, leaving the limits to the heading", async () => {
    show();
    await expect
      .element(page.getByText(uploadCopy("dropzone.drop")))
      .toBeVisible();
    await expect
      .element(
        page.getByRole("button", { name: uploadCopy("dropzone.choose") })
      )
      .toBeVisible();
    await expect
      .element(page.getByText(uploadCopy("dropzone.formats")))
      .toBeVisible();
  });

  it.each(["{Enter}", " "])("opens the chooser on %j", async (key) => {
    const click = vi.spyOn(HTMLInputElement.prototype, "click");
    show();
    await userEvent.tab();
    await userEvent.keyboard(key);
    await expect.poll(() => click.mock.calls.length).toBeGreaterThan(0);
    click.mockRestore();
  });

  it("hands every dropped picture to pick, once", async () => {
    const pick = show();
    await expect.element(area()).toBeVisible();
    const files = [photo("a.jpg"), photo("b.jpg")];
    drop(files);
    await expect.poll(() => pick.mock.calls.length).toBe(1);
    expect(pick.mock.calls[0]?.[0]).toHaveLength(2);
  });

  it("refuses a file that is not a picture, telling why, and picks nothing", async () => {
    const pick = show();
    await expect.element(area()).toBeVisible();
    drop([text()]);
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls)
      .toContainEqual([uploadCopy("dropzone.wrongType"), "error"]);
    expect(pick).not.toHaveBeenCalled();
  });

  it("ignores a drop while disabled", async () => {
    const pick = show({ disabled: true });
    await expect.element(area()).toBeVisible();
    drop([photo("a.jpg")]);
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(pick).not.toHaveBeenCalled();
  });
});
