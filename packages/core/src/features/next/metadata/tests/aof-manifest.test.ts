// @module-tag unit
import { METADATA } from "../../../metadata/constants/metadata";
import { aofManifest } from "../utils/aof-manifest";

const manifest = aofManifest({
  description: "What it is",
  ground: "#fafafa",
  name: "Test App",
});

describe("aofManifest", () => {
  it("opens installed in its own window (ADR 0025), at the root", () => {
    expect(manifest).toMatchObject({
      display: "standalone",
      id: METADATA.PATH.ROOT,
      scope: METADATA.PATH.ROOT,
      start_url: METADATA.PATH.ROOT,
    });
  });

  it("is named for the App and coloured with the ground", () => {
    expect(manifest).toMatchObject({
      background_color: "#fafafa",
      description: "What it is",
      name: "Test App",
      short_name: "Test App",
      theme_color: "#fafafa",
    });
  });

  it("lists the manifest icons", () => {
    expect(manifest.icons?.length).toBeGreaterThan(0);
  });
});
