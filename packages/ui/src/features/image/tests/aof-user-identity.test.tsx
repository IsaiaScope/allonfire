// @module-tag unit

import { LOCAL } from "@allonfire/config/local/addresses";
import { IMAGE } from "@allonfire/storage/features/image/constants/image";
import { renderToStaticMarkup } from "react-dom/server";
import {
  AOF_USER_IDENTITY,
  AOFUserIdentity,
  type AOFUserIdentityProps,
} from "../components/aof-user-identity";

const SIGNED = `${LOCAL.URL.IMAGE_SERVER}/sig/rs:fit:256:0/exp:1793199600/plain/s3://${IMAGE.BUCKET.DEFAULT}/avatar-u1-x.avif`;

const markup = (props: Partial<AOFUserIdentityProps> = {}) =>
  renderToStaticMarkup(
    <AOFUserIdentity
      avatarProps={{ image: SIGNED, name: "Ann" }}
      subtitle="ann@example.test"
      title="Ann"
      {...props}
    />
  );

describe("AOFUserIdentity", () => {
  it("draws the picture, the title and the subtitle under it", () => {
    const html = markup();
    expect(html).toContain(SIGNED);
    expect(html.indexOf("Ann</")).toBeLessThan(
      html.indexOf("ann@example.test")
    );
  });

  it("draws a card's picture at 42 px and a row's at 36, in the same size the tile is drawn", () => {
    const card = markup({ size: "card" });
    expect(card).toContain(`width="${AOF_USER_IDENTITY.FACE_PX.card}"`);
    expect(card).toContain("size-10.5");
    const row = markup({ size: "row" });
    expect(row).toContain(`width="${AOF_USER_IDENTITY.FACE_PX.row}"`);
    expect(row).toContain("size-9");
  });

  it("is a row by default", () => {
    expect(markup()).toBe(markup({ size: "row" }));
  });

  it("leaves out the second line when there is no subtitle", () => {
    expect(markup({ subtitle: undefined })).not.toContain("text-muted");
  });

  it("lets the picture's own classes and the tile's tint through", () => {
    const html = markup({
      avatarProps: {
        className: "size-(--field-tile)",
        image: null,
        initialClassName: "bg-red-500",
        name: "Ann",
      },
    });
    expect(html).toContain("size-(--field-tile)");
    expect(html).toContain("bg-red-500");
  });

  it("keeps the lines cut by an ellipsis inside the box, never wider", () => {
    expect(markup()).toContain("min-w-0");
    expect(markup()).toContain("truncate");
  });

  it("draws its children after the lines (a link laid over the row)", () => {
    const html = renderToStaticMarkup(
      <AOFUserIdentity avatarProps={{ image: null, name: "Ann" }} title="Ann">
        <a href="/x">open</a>
      </AOFUserIdentity>
    );
    expect(html.indexOf("open")).toBeGreaterThan(html.indexOf("Ann</"));
  });
});
