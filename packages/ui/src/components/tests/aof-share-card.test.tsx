// @module-tag unit
import { objectValues } from "@allonfire/core/shared/utils/object";
import type { AppLogo } from "@allonfire/design/brand/aof-logo";
import { renderToStaticMarkup } from "react-dom/server";
import { AOFShareCard, type ShareCardLook } from "../aof-share-card";

const LOOK = {
  colors: {
    background: "#000011",
    foreground: "#000012",
    mutedForeground: "#000013",
  },
  edge: { height: 40, image: "data:image/svg+xml,edge" },
  fontFamily: "Test Face",
} as const satisfies ShareCardLook;
const BAND = "#000021";
const APP = {
  banner: ["#000031", "#000032", "#000033"],
  fontFamily: "Test Face",
  name: "Test app",
} as const satisfies AppLogo;

const card = (look: ShareCardLook) =>
  renderToStaticMarkup(
    <AOFShareCard
      band={BAND}
      description="Plain description"
      headline="Plain headline"
      logo={APP}
      {...look}
    />
  );

describe("AOFShareCard", () => {
  it("sets the App's logo, headline and description under its band", () => {
    const html = card(LOOK);
    for (const text of [APP.name, "Plain headline", "Plain description"]) {
      expect(html).toContain(text);
    }
    expect(html).toContain(BAND);
  });

  it("wears the Design's look: ground, text colours, face and edge", () => {
    const html = card(LOOK);
    for (const value of [
      ...objectValues(LOOK.colors),
      LOOK.fontFamily,
      LOOK.edge.image,
    ]) {
      expect(html).toContain(value);
    }
  });

  it("draws every App's logo the same: square, dark, rounded, 300 high", () => {
    const html = card(LOOK);
    expect(html).toContain("height:300px");
    expect(html).toContain(APP.banner[0]);
  });

  it("draws no edge for a Design without one", () => {
    const { edge: _, ...plain } = LOOK;
    expect(card(plain)).not.toContain(LOOK.edge.image);
  });
});
