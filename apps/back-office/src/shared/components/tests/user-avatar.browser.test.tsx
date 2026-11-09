// @module-tag integration
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { LOCAL } from "@allonfire/config/local/addresses";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { render } from "vitest-browser-react";
import { UserAvatar } from "../user-avatar";

vi.mock("@allonfire/ui/shared/components/aof-image", async () => ({
  AOFImage: (await import("@/shared/tests/image-mock")).ImageMock,
}));

const SIGNED = `${LOCAL.URL.IMAGE_SERVER}/signature/rs:fit:256:0/plain/s3://${IMAGE.BUCKET.DEFAULT}/avatar-u-1.avif`;
const GOOGLE = `https://${AUTH.PICTURE_HOSTS[0]}/a/picture=s96-c`;

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
