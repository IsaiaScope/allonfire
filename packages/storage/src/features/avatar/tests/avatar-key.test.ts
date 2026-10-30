// @module-tag unit
import { IMAGE_SERVER } from "../../image-server/constants/image-server";
import { privateLinkExpiry } from "../../image-server/sign";
import { avatarKey, avatarKeyOf, avatarLink } from "../utils/avatar-key";

const AVATAR_OF_U1 = /^avatar-u1-[0-9a-f-]{36}\.avif$/;
const NOW = new Date("2026-10-28T10:05:00Z");
const GOOGLE = "https://lh3.googleusercontent.com/a/x=s96-c";
const AN_IMAGE = "0f8fad5b-d9cb-469f-a165-70867728950e.avif";

describe("avatarKey", () => {
  it("names a new file each time, under the User's id", () => {
    const first = avatarKey("u1");
    expect(first).toMatch(AVATAR_OF_U1);
    expect(avatarKey("u1")).not.toBe(first);
  });
});

describe("avatarKeyOf", () => {
  it("knows our own Avatar's file by its name", () => {
    const key = avatarKey("u1");
    expect(avatarKeyOf(key)).toBe(key);
  });

  it.each([
    ["a provider's picture", GOOGLE],
    ["an Image's file", AN_IMAGE],
    ["a name only shaped like ours", "avatar-../../image/x.avif"],
    ["a name with no uuid", "avatar-u1.avif"],
    ["none", null],
  ])("is null for %s", (_, image) => {
    expect(avatarKeyOf(image)).toBeNull();
  });
});

describe("avatarLink", () => {
  it("signs our file at the Avatar's width, for the hour", () => {
    const key = avatarKey("u1");
    const link = avatarLink(key, NOW) ?? "";
    expect(link).toContain(`/rs:fit:${IMAGE_SERVER.AVATAR_WIDTH}:0/`);
    expect(link).toContain(`/exp:${privateLinkExpiry(NOW).getTime() / 1000}/`);
    expect(link).toContain(key);
  });

  it("passes a provider's picture through unchanged, and none as none", () => {
    expect(avatarLink(GOOGLE, NOW)).toBe(GOOGLE);
    expect(avatarLink(null, NOW)).toBeNull();
  });

  it.each([
    ["an old app path", "/storage/images/avatar-allonfire-admin.avif"],
    ["a name only shaped like ours", "avatar-u1.avif"],
    ["an Image's file", AN_IMAGE],
    ["a plain http address", "http://example.com/me.png"],
  ])("gives no link for %s, so the page asks for nothing", (_, image) => {
    expect(avatarLink(image, NOW)).toBeNull();
  });
});
