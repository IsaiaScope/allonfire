// @module-tag unit
import { UNIT } from "@allonfire/core/shared/constants/units";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFFileUpload, fileRefusal } from "../aof-file-upload";

const LABELS = {
  choose: "Select a file",
  drop: "Drop your file here",
  formats: "PDF or PNG, up to 5 MB",
  remove: "Remove",
  tooLarge: "Too large",
  wrongType: "Not a PDF or PNG",
};
const render = (items: Parameters<typeof AOFFileUpload>[0]["items"] = []) =>
  renderToStaticMarkup(
    <AOFFileUpload
      accept="application/pdf,image/png"
      items={items}
      label="Attachment"
      labels={LABELS}
      maxBytes={5_000_000}
      name="attachment"
      onFileAccept={vi.fn()}
      onRemove={vi.fn()}
    />
  );

describe("AOFFileUpload", () => {
  it("shows where to drop a file, what it takes and a button to select one", () => {
    const html = render();
    expect(html).toContain(LABELS.drop);
    expect(html).toContain(LABELS.formats);
    expect(html).toContain(LABELS.choose);
  });

  it("holds a file input named and filtered as asked, so a post sends the file", () => {
    const html = render();
    expect(html).toContain('name="attachment"');
    expect(html).toContain('accept="application/pdf,image/png"');
  });

  it("lists each file it holds: its name, its size in core's units (1024 bytes a kB, as the limits count) and a button to remove it", () => {
    const html = render([
      { id: "a", name: "contract.pdf", size: 2.5 * UNIT.BYTES_PER_MIB },
      { id: "b", name: "scan.png", size: 12.5 * UNIT.BYTES_PER_KIB },
    ]);
    expect(html).toContain("contract.pdf");
    expect(html).toContain("2.5 MB");
    expect(html).toContain("scan.png");
    expect(html).toContain("12.5 kB");
    expect(html.match(/aria-label="Remove"/g)).toHaveLength(2);
  });

  it("draws its area and rows in the Design's corners, never round", () => {
    const html = render([{ id: "a", name: "scan.png", size: 1 }]);
    expect(html).toContain("rounded-lg");
    expect(html).not.toContain("rounded-full");
  });
});

/** The drop area's opening tag. */
const DROPZONE_TAG = /<[^>]*data-slot="file-upload-dropzone"[^>]*>/;

describe("AOFFileUpload for assistive tech", () => {
  it("names its drop area, the one stop a keyboard reaches, and links its error to it", () => {
    const html = renderToStaticMarkup(
      <AOFFileUpload
        aria-describedby="attachment-error"
        items={[]}
        label="Attachment"
        labels={LABELS}
        maxBytes={5_000_000}
        onFileAccept={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    const dropzone = html.match(DROPZONE_TAG)?.[0] ?? "";
    expect(dropzone).toContain('aria-label="Attachment"');
    expect(dropzone).toContain('aria-describedby="attachment-error"');
  });
});

describe("fileRefusal", () => {
  const rules = {
    accept: "application/pdf,.heic",
    labels: LABELS,
    maxBytes: 5_000_000,
  };
  const file = (name: string, type: string, bytes = 10) =>
    new File([new Uint8Array(bytes)], name, { type });

  it("takes a file by its type or its extension, whatever the extension's case", () => {
    expect(fileRefusal(rules, file("notes.pdf", "application/pdf"))).toBeNull();
    // An iPhone's photo, as some browsers hand it over: no type.
    expect(fileRefusal(rules, file("IMG_0001.HEIC", ""))).toBeNull();
  });

  it("refuses another type, and a file too large, in the caller's words", () => {
    expect(fileRefusal(rules, file("photo.png", "image/png"))).toBe(
      LABELS.wrongType
    );
    expect(
      fileRefusal(
        { ...rules, maxBytes: 5 },
        file("notes.pdf", "application/pdf")
      )
    ).toBe(LABELS.tooLarge);
  });

  it("lets the drop area's own check pass an extension in capitals too", () => {
    const html = renderToStaticMarkup(
      <AOFFileUpload
        accept={rules.accept}
        items={[]}
        label="Attachment"
        labels={LABELS}
        maxBytes={rules.maxBytes}
        onFileAccept={vi.fn()}
        onRemove={vi.fn()}
      />
    );
    expect(html).toContain('accept="application/pdf,.heic,.HEIC"');
  });
});
