// @module-tag integration

import { App, ImageAccess } from "@allonfire/database/enums";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { useSelector } from "@tanstack/react-form";
import { useCallback } from "react";
import { page, userEvent } from "vitest/browser";
import { aofToast } from "../../../../shared/hooks/use-aof-toast";
import { renderInUi } from "../../../../shared/tests/render-in-ui";
import {
  type AddImagesForm,
  useAddImagesForm,
} from "../hooks/use-add-images-form";
import { useImageFileInput } from "../hooks/use-image-file-input";
import { useImageRows } from "../hooks/use-image-rows";
import { uploadCopy } from "./image-upload-copy";

vi.mock("../../../../shared/hooks/use-aof-toast", async (original) => ({
  ...(await original<
    typeof import("../../../../shared/hooks/use-aof-toast")
  >()),
  aofToast: vi.fn(),
}));

const HEADING = "Add pictures";
const APPLY = "apply";
const COUNT = "count";
const IDS = "ids";

/** A tiny file; the browser holds its bytes, the form only its name. */
const photo = (name: string) => new File(["x"], name, { type: "image/jpeg" });
const oversized = (name: string) => {
  const file = photo(name);
  Object.defineProperty(file, "size", { value: IMAGE.LIMIT.FILE_BYTES + 1 });
  return file;
};

const rowsOf = (state: { values: AddImagesForm["state"]["values"] }) =>
  state.values.rows;

const RemoveRow = ({
  index,
  name,
  remove,
}: {
  index: number;
  name: string;
  remove: (index: number) => void;
}) => {
  const onClick = useCallback(() => remove(index), [index, remove]);
  return (
    <span data-remove-row>
      <button onClick={onClick} type="button">{`Remove ${name}`}</button>
    </span>
  );
};

/** The hook's callers' side: a heading, a picker, Apply and a Remove button per row. */
const Harness = ({ onForm }: { onForm: (held: Held) => void }) => {
  const form = useAddImagesForm([App.LAURA, App.BACK_OFFICE], false);
  const { applyToAll, pick, root } = useImageRows(form);
  const remove = useCallback(
    (index: number) => form.removeFieldValue("rows", index),
    [form]
  );
  const { inputProps } = useImageFileInput(pick);
  const rows = useSelector(form.store, rowsOf);
  onForm({ form, pick });
  return (
    <div ref={root}>
      <h1 tabIndex={-1}>{HEADING}</h1>
      <input {...inputProps} />
      <button onClick={applyToAll} type="button">
        {APPLY}
      </button>
      <output data-testid={COUNT}>{rows.length}</output>
      <output data-testid={IDS}>{rows.map(({ id }) => id).join(" ")}</output>
      {rows.map((row, index) => (
        <RemoveRow
          index={index}
          key={row.id}
          name={row.file.name}
          remove={remove}
        />
      ))}
    </div>
  );
};

type Held = { form: AddImagesForm; pick: (files: File[]) => void };
let held: Held | null = null;
const form = () => {
  if (!held) {
    throw new Error("the harness has not rendered");
  }
  return held.form;
};
const holdForm = (next: Held) => {
  held = next;
};
/** Files handed to the hook as they are: a picker rebuilds a file and its size with it. */
const pickAsIs = (...files: File[]) => held?.pick(files);
const show = () =>
  renderInUi({ children: <Harness onForm={holdForm} />, messages: {} });
const pick = (...files: File[]) =>
  userEvent.upload(page.getByLabelText(uploadCopy("pick.input")), files);
const removeButton = (name: string) =>
  page.getByRole("button", { name: `Remove ${name}` });

beforeEach(() => {
  vi.mocked(aofToast).mockClear();
  held = null;
});

describe("useImageRows pick", () => {
  it("keeps 20 rows and tells why when 21 pictures are picked", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"), photo("c.jpg"));
    await pick(
      ...Array.from({ length: IMAGE.LIMIT.FILES_PER_UPLOAD + 1 }, (_, index) =>
        photo(`p${index}.jpg`)
      )
    );
    await expect
      .element(page.getByTestId(COUNT))
      .toHaveTextContent(String(IMAGE.LIMIT.FILES_PER_UPLOAD));
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls)
      .toContainEqual([uploadCopy("field.tooManyFiles"), "error"]);
  });

  it("leaves out a picture over the file limit and keeps the others", async () => {
    show();
    await expect.element(page.getByTestId(COUNT)).toBeVisible();
    pickAsIs(photo("a.jpg"), oversized("huge.jpg"), photo("b.jpg"));
    await expect.element(page.getByTestId(COUNT)).toHaveTextContent("2");
    await expect
      .poll(() => vi.mocked(aofToast).mock.calls)
      .toContainEqual([uploadCopy("field.fileTooLarge"), "error"]);
    await expect.element(removeButton("huge.jpg")).not.toBeInTheDocument();
  });

  it("gives each picked file a key of its own", async () => {
    show();
    await pick(photo("a.jpg"));
    await pick(photo("b.jpg"));
    await expect.element(page.getByTestId(COUNT)).toHaveTextContent("2");
    const ids = form().state.values.rows.map(({ id }) => id);
    expect(new Set(ids).size).toBe(2);
    expect(ids.every((id) => id)).toBe(true);
  });

  it("starts each row from the shared set: private, in the first App", async () => {
    show();
    await pick(photo("a.jpg"));
    await expect.element(page.getByTestId(COUNT)).toHaveTextContent("1");
    expect(form().state.values.rows[0]).toMatchObject({
      access: ImageAccess.PRIVATE,
      alt: { en: "", it: "" },
      apps: [App.LAURA],
    });
  });
});

describe("useImageRows applyToAll", () => {
  it("copies the shared set onto every row and leaves alt alone", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await expect.element(page.getByTestId(COUNT)).toHaveTextContent("2");
    form().setFieldValue("rows[0].alt.en", "The sea");
    form().setFieldValue("shared.access", ImageAccess.PUBLIC);
    form().setFieldValue("shared.apps", [App.LAURA, App.BACK_OFFICE]);
    await page.getByRole("button", { name: APPLY }).click();
    for (const row of form().state.values.rows) {
      expect(row.access).toBe(ImageAccess.PUBLIC);
      expect(row.apps).toEqual([App.LAURA, App.BACK_OFFICE]);
    }
    expect(form().state.values.rows[0]?.alt.en).toBe("The sea");
  });
});

describe("useImageRows remove", () => {
  it("moves focus to the next row's Remove button", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"), photo("c.jpg"));
    await removeButton("b.jpg").click();
    await expect.element(removeButton("c.jpg")).toHaveFocus();
  });

  it("moves focus to the previous row's when the last goes", async () => {
    show();
    await pick(photo("a.jpg"), photo("b.jpg"));
    await removeButton("b.jpg").click();
    await expect.element(removeButton("a.jpg")).toHaveFocus();
  });

  it("moves focus to the heading when the only row goes", async () => {
    show();
    await pick(photo("a.jpg"));
    await removeButton("a.jpg").click();
    await expect
      .element(page.getByRole("heading", { name: HEADING }))
      .toHaveFocus();
  });
});
