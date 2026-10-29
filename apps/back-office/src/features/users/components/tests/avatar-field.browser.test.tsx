// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { HTTP } from "@allonfire/core/features/http/constants/http";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import { avatarChangeOf } from "@allonfire/ui/lib/avatar-change";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { useCallback } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { UserAvatar } from "@/shared/components/user-avatar";
import { USERS } from "../../constants/users";

/** The storage's HEIC Fixture, served by Vite to the browser under test. */
const HEIC_URL = new URL(
  "../../../../../../../packages/storage/src/features/image/fixtures/files/colors-no-alpha.heic",
  import.meta.url
).href;
/** A size as the file row shows it: a number, then kB. */
const KILOBYTES = /\d+(\.\d)?\s?kB/;

// next/image reaches the browser as a CommonJS object, not a component: the
// mock shows what AOFImage was handed instead.
vi.mock("@allonfire/ui/components/aof-image", async () => {
  const react = await import("react");
  return {
    AOFImage: ({
      loader,
      onError,
      src,
      unoptimized,
    }: {
      loader?: (args: { src: string; width: number }) => string;
      onError?: (event: { currentTarget: HTMLElement }) => void;
      src: string;
      unoptimized?: boolean;
    }) => {
      // A "/broken" picture fails to load, as an expired link would.
      const loaded = react.useCallback(
        (element: HTMLElement | null) => {
          if (element && src.startsWith("/broken")) {
            onError?.({ currentTarget: element });
          }
        },
        [onError, src]
      );
      return (
        <span
          data-optimizer={loader || unoptimized ? "none" : "app"}
          data-src={loader ? loader({ src, width: 2048 }) : src}
          data-testid="picture"
          ref={loaded}
        />
      );
    },
  };
});

const LABELS = {
  busy: "Preparing the picture",
  cancel: "Cancel",
  change: "Change",
  choose: "Select a picture",
  cropAgain: "Crop again",
  current: "Current picture",
  dialogTitle: "Crop the picture",
  drop: "Drop your picture here",
  formats: "JPEG, PNG, WebP, AVIF or HEIC, up to 20 MB",
  remove: "Remove the picture",
  tooLarge: "That picture is too large",
  unreadable: "That picture could not be read",
  use: "Use",
  wrongType: "That is not a picture",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
};
const SIGNED = `${LOCAL.URL.IMAGE_SERVER}/signature/rs:fit:256:0/plain/s3://image/avatar-u-1.avif`;
const GOOGLE = `https://${AUTH.PICTURE_HOSTS[0]}/a/picture=s96-c`;

/** A picture the browser can draw: a PNG drawn here, 800x600 unless told. */
const photo = async (width = 800, height = 600) => {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (context) {
    context.fillStyle = "#c0392b";
    context.fillRect(0, 0, width, height);
  }
  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, HTTP.CONTENT_TYPE.PNG)
  );
  return new File([blob ?? new Blob()], "photo.png", {
    type: HTTP.CONTENT_TYPE.PNG,
  });
};
const unreadable = () =>
  new File([new Uint8Array([1, 2, 3])], "photo.heic", { type: "image/heic" });
/** An iPhone's picture: a real HEIC, which Chromium cannot draw by itself. */
const iphonePhoto = async () =>
  new File([await (await fetch(HEIC_URL)).blob()], "IMG_0001.HEIC", {
    type: "image/heic",
  });

const NO_AVATAR: { avatar: File | null } = { avatar: null };
/** The field's label, and so its drop area's name. */
const LABEL = "Picture";

const STORED = "/stored-avatar.avif";

const AvatarForm = ({
  current,
  onSubmit,
}: {
  current?: string;
  onSubmit: () => void;
}) => {
  const form = useAOFForm({ defaultValues: NO_AVATAR });
  const submit = useCallback(
    (event: { preventDefault: () => void }) => {
      event.preventDefault();
      onSubmit();
    },
    [onSubmit]
  );
  return (
    <form onSubmit={submit}>
      <form.AppField name={USERS.AVATAR_FIELD}>
        {(field) => (
          <field.AvatarField current={current} label={LABEL} labels={LABELS} />
        )}
      </form.AppField>
      <button type="submit">Save</button>
    </form>
  );
};

/** The input the form posts: the field's own, under the field's name. */
const fileInput = () =>
  document.querySelector<HTMLInputElement>(
    `input[type="file"][name="${USERS.AVATAR_FIELD}"]`
  );
/** The input a visitor picks with: the drop area's, which posts nothing. */
const picker = () =>
  document.querySelector<HTMLInputElement>('input[type="file"]:not([name])');
/** Picks `file` through the drop area's input, found by its exact name
 *  ("Remove the picture" holds the word too): the drop area carries the same
 *  name, and the input follows it. */
const pick = (file: File) =>
  userEvent.upload(page.getByLabelText(LABEL, { exact: true }).last(), file);
const dialog = () => page.getByRole("dialog", { name: LABELS.dialogTitle });
/** What the form posts about the picture, read as an action reads it. */
const posted = () => {
  const form = document.querySelector("form");
  return form
    ? avatarChangeOf(new FormData(form), USERS.AVATAR_FIELD).kind
    : null;
};

describe("AOFAvatarField", () => {
  it("shows where to drop a picture, the formats it takes and a button to select one", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await expect.element(page.getByText(LABELS.drop)).toBeVisible();
    await expect.element(page.getByText(LABELS.formats)).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: LABELS.choose }))
      .toBeVisible();
  });

  it("takes every format the storage takes, HEIC included", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    const accepted = picker()?.accept.split(",") ?? [];
    expect(accepted).toEqual(
      expect.arrayContaining([
        "image/jpeg",
        HTTP.CONTENT_TYPE.PNG,
        "image/webp",
        "image/avif",
        "image/heic",
        ".heic",
      ])
    );
  });

  it("lists the picture used: its name, its size and a button to remove it", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await expect.element(page.getByText("photo.png")).toBeVisible();
    await expect.element(page.getByText(KILOBYTES)).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: LABELS.remove }))
      .toBeVisible();
  });

  it("converts an iPhone's HEIC first, so it crops in every browser", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await iphonePhoto());
    await expect.element(dialog(), { timeout: 15_000 }).toBeVisible();
    await page.getByRole("button", { name: LABELS.use }).click();
    await expect.poll(() => fileInput()?.files?.length).toBe(1);
  });

  it("opens the crop dialog on a picked photo; Use keeps a 512x512 square in its file input", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await expect.element(dialog()).toBeVisible();
    await expect
      .element(page.getByRole("button", { name: LABELS.use }))
      .toBeEnabled();
    await page.getByRole("button", { name: LABELS.use }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.poll(() => fileInput()?.files?.length).toBe(1);
    const [held] = fileInput()?.files ?? [];
    // WebP where the browser encodes it (Chromium), else JPEG (Safari):
    // never a PNG, which a photo can push past the action's 1 MB.
    expect(["image/webp", "image/jpeg"]).toContain(held?.type);
    const bitmap = await createImageBitmap(held ?? new Blob());
    expect([bitmap.width, bitmap.height]).toEqual([
      AVATAR.CROP_SIZE,
      AVATAR.CROP_SIZE,
    ]);
    await expect
      .element(page.getByRole("button", { name: LABELS.change }))
      .toBeVisible();
  });

  it("Crop again reopens the dialog on the same original", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await page.getByRole("button", { name: LABELS.cropAgain }).click();
    await expect.element(dialog()).toBeVisible();
  });

  it("removing the picture clears the field and its file input", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await page.getByRole("button", { name: LABELS.remove }).click();
    await expect.poll(() => fileInput()?.files?.length ?? 0).toBe(0);
    await expect
      .element(page.getByRole("button", { name: LABELS.choose }))
      .toBeVisible();
  });

  it("refuses a picture it cannot read, even converted, and the form still submits", async () => {
    const onSubmit = vi.fn();
    await render(<AvatarForm onSubmit={onSubmit} />);
    await pick(unreadable());
    await expect.element(page.getByText(LABELS.unreadable)).toBeVisible();
    expect(dialog().query()).toBeNull();
    await page.getByRole("button", { name: "Save" }).click();
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("AOFAvatarField's picks", () => {
  // The browser fills in the type from the name here; a file handed over
  // with none is fileRefusal's unit test.
  it("takes an iPhone's HEIC named in capitals", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    const heic = await iphonePhoto();
    await pick(new File([heic], "IMG_0001.HEIC", { type: "" }));
    await expect.element(dialog(), { timeout: 15_000 }).toBeVisible();
  });

  it("refuses a file that is no picture, in the field's own words", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(
      new File(["%PDF-1.7"], "notes.pdf", { type: "application/pdf" })
    );
    await expect.element(page.getByText(LABELS.wrongType)).toBeVisible();
    expect(dialog().query()).toBeNull();
  });

  it("keeps the cropped picture posted when a second pick is refused", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await pick(unreadable());
    await expect.element(page.getByText(LABELS.unreadable)).toBeVisible();
    await expect.poll(posted).toBe("picture");
  });

  it("a cancelled second pick leaves the first picture listed, name and all", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await pick(
      new File([await photo()], "second.png", { type: HTTP.CONTENT_TYPE.PNG })
    );
    await page.getByRole("button", { name: LABELS.cancel }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.element(page.getByText("photo.png")).toBeVisible();
    expect(page.getByText("second.png").query()).toBeNull();
  });

  it("a second pick opens the dialog on the new picture, never the first one", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    // The kept original's own link, as Crop again shows it.
    await page.getByRole("button", { name: LABELS.cropAgain }).click();
    await expect.element(dialog()).toBeVisible();
    const first = dialog().element().querySelector("img")?.src;
    await page.getByRole("button", { name: LABELS.cancel }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    const shown = new Set<string>();
    const watch = new MutationObserver(() => {
      for (const image of document.querySelectorAll('[role="dialog"] img')) {
        if (image instanceof HTMLImageElement) {
          shown.add(image.src);
        }
      }
    });
    watch.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: true,
    });
    await pick(await photo(600, 800));
    await expect.element(dialog()).toBeVisible();
    watch.disconnect();
    expect(first).toBeTruthy();
    expect([...shown]).not.toContain(first);
  });

  it("keeps the cropped picture posted when a second pick is cancelled", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.cancel }).click();
    await expect.element(dialog()).not.toBeInTheDocument();
    await expect.poll(posted).toBe("picture");
  });
});

describe("AOFAvatarField with a current picture", () => {
  it("removing the current picture posts the removal and draws the empty drop area", async () => {
    await render(<AvatarForm current={STORED} onSubmit={vi.fn()} />);
    await expect.element(page.getByText(LABELS.current)).toBeVisible();
    expect(posted()).toBe("unchanged");
    await page.getByRole("button", { name: LABELS.remove }).click();
    await expect
      .element(page.getByText(LABELS.current))
      .not.toBeInTheDocument();
    await expect
      .element(page.getByRole("button", { name: LABELS.choose }))
      .toBeVisible();
    expect(posted()).toBe("removed");
  });

  it("a new picture after removing posts the file and no removal", async () => {
    await render(<AvatarForm current={STORED} onSubmit={vi.fn()} />);
    await page.getByRole("button", { name: LABELS.remove }).click();
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await expect.poll(() => fileInput()?.files?.length).toBe(1);
    expect(posted()).toBe("picture");
  });

  it("removing a new pick goes back to the current picture", async () => {
    await render(<AvatarForm current={STORED} onSubmit={vi.fn()} />);
    await pick(await photo());
    await page.getByRole("button", { name: LABELS.use }).click();
    await page.getByRole("button", { name: LABELS.remove }).click();
    await expect.element(page.getByText(LABELS.current)).toBeVisible();
    expect(posted()).toBe("unchanged");
  });
});

describe("AOFAvatarField's crop dialog", () => {
  it("fills a phone's width but for a thin margin", async () => {
    await page.viewport(390, 844);
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await expect.element(dialog()).toBeVisible();
    // Once it has opened: it zooms in from 95%.
    await expect
      .poll(() => dialog().element().getBoundingClientRect().width)
      .toBeGreaterThanOrEqual(document.documentElement.clientWidth - 16);
  });

  it("zooms with two named buttons, no slider: out only once zoomed in", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    const zoomOut = dialog().getByRole("button", { name: LABELS.zoomOut });
    await expect.element(zoomOut).toBeDisabled();
    await dialog().getByRole("button", { name: LABELS.zoomIn }).click();
    await expect.element(zoomOut).toBeEnabled();
    expect(dialog().getByRole("slider").query()).toBeNull();
  });

  it("on a phone, frames a portrait photo to its own shape: no bands at its sides", async () => {
    await page.viewport(390, 844);
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo(600, 800));
    const width = (slot: string) =>
      document.querySelector(`[data-slot="${slot}"]`)?.getBoundingClientRect()
        .width ?? 0;
    await expect
      .poll(() => width("cropper-image") / width("cropper"))
      .toBeGreaterThan(0.99);
  });

  it("leads Cancel and Use each with an icon", async () => {
    await render(<AvatarForm onSubmit={vi.fn()} />);
    await pick(await photo());
    await expect.element(dialog()).toBeVisible();
    for (const name of [LABELS.cancel, LABELS.use]) {
      expect(
        dialog().getByRole("button", { name }).element().querySelector("svg")
      ).not.toBeNull();
    }
  });
});

describe("UserAvatar", () => {
  const pictureOf = (container: HTMLElement) =>
    container.querySelector<HTMLElement>('[data-testid="picture"]');

  it("loads a stored Avatar from its signed link as it is, at every width", async () => {
    const { container } = await render(
      <UserAvatar image={SIGNED} name="Laura" side={36} />
    );
    expect(pictureOf(container)?.dataset).toMatchObject({
      optimizer: "none",
      src: SIGNED,
    });
  });

  it("sends a sign-in provider's picture through the App's optimizer", async () => {
    const { container } = await render(
      <UserAvatar image={GOOGLE} name="Laura" side={36} />
    );
    expect(pictureOf(container)?.dataset).toMatchObject({
      optimizer: "app",
      src: GOOGLE,
    });
  });

  it("shows only the initial when the picture fails, never a broken image", async () => {
    const { container } = await render(
      <UserAvatar image="/broken/picture.avif" name="Laura" side={36} />
    );
    await expect.poll(() => pictureOf(container)?.hidden).toBe(true);
  });

  it("shows a new link again after the old one failed", async () => {
    const { container, rerender } = await render(
      <UserAvatar image="/broken/picture.avif" name="Laura" side={36} />
    );
    await expect.poll(() => pictureOf(container)?.hidden).toBe(true);
    await rerender(
      <UserAvatar image="/fresh/picture.avif" name="Laura" side={36} />
    );
    expect(pictureOf(container)?.hidden).toBe(false);
  });

  it("shows only the initial without a picture", async () => {
    const { container } = await render(
      <UserAvatar image={null} name="Laura" side={36} />
    );
    expect(pictureOf(container)).toBeNull();
    expect(container.textContent).toBe("L");
  });
});
