// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { AVATAR } from "@allonfire/storage/features/avatar/constants/avatar";
import { useAOFForm } from "@allonfire/ui/lib/form";
import { useCallback } from "react";
import { page, userEvent } from "vitest/browser";
import { render } from "vitest-browser-react";
import { UserAvatar } from "@/shared/components/user-avatar";

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
  cancel: "Cancel",
  change: "Change",
  choose: "Select a picture",
  cropAgain: "Crop again",
  dialogTitle: "Crop the picture",
  drop: "Drop your picture here",
  formats: "JPEG, PNG, WebP, AVIF or HEIC, up to 20 MB",
  preparing: "Preparing the picture",
  remove: "Remove the picture",
  tooLarge: "That picture is too large",
  unreadable: "That picture could not be read",
  use: "Use",
  zoomIn: "Zoom in",
  zoomOut: "Zoom out",
};
const SIGNED =
  "http://localhost:9010/signature/rs:fit:256:0/plain/s3://image/avatar-u-1.avif";
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
    canvas.toBlob(resolve, "image/png")
  );
  return new File([blob ?? new Blob()], "photo.png", { type: "image/png" });
};
const unreadable = () =>
  new File([new Uint8Array([1, 2, 3])], "photo.heic", { type: "image/heic" });
/** An iPhone's picture: a real HEIC, which Chromium cannot draw by itself. */
const iphonePhoto = async () =>
  new File([await (await fetch(HEIC_URL)).blob()], "IMG_0001.HEIC", {
    type: "image/heic",
  });

const NO_AVATAR: { avatar: File | null } = { avatar: null };

const AvatarForm = ({ onSubmit }: { onSubmit: () => void }) => {
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
      <form.AppField name="avatar">
        {(field) => <field.AvatarField label="Picture" labels={LABELS} />}
      </form.AppField>
      <button type="submit">Save</button>
    </form>
  );
};

const fileInput = () =>
  document.querySelector<HTMLInputElement>('input[type="file"][name="avatar"]');
const pick = async (file: File) => {
  const input = fileInput();
  if (input) {
    await userEvent.upload(input, file);
  }
};
const dialog = () => page.getByRole("dialog", { name: LABELS.dialogTitle });

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
    const accepted = fileInput()?.accept.split(",") ?? [];
    expect(accepted).toEqual(
      expect.arrayContaining([
        "image/jpeg",
        "image/png",
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
