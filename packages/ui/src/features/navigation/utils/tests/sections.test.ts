// @module-tag unit
import { AUTH } from "@allonfire/auth/shared/constants/auth";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { App } from "@allonfire/database/enums";
import {
  IconHome,
  IconPhoto,
  IconServer2,
  IconUsers,
} from "@tabler/icons-react";
import { NAVIGATION } from "../../constants/navigation";
import type { AppDescriptor } from "../../types/app-descriptor";
import {
  currentSection,
  currentSubPage,
  isCurrentSection,
  sectionEntry,
  sectionHref,
  sectionPosition,
  subPagePosition,
} from "../sections";

const IMAGES = { icon: IconPhoto, label: "images", path: "/storage/images" };
const HOME = { icon: IconHome, label: "home", path: AUTH.PAGE.HOME };
const USERS = { icon: IconUsers, label: "users", path: "/users" };
const STORAGE = {
  icon: IconServer2,
  label: "storage",
  pages: [IMAGES],
  path: "/storage",
};

/** A descriptor with only what these helpers read: the App's Sections. */
const app = {
  app: App.BACK_OFFICE,
  sections: [HOME, USERS, STORAGE],
} as const satisfies Pick<AppDescriptor, "app" | "sections">;

describe("Section helpers", () => {
  it("links Home to the root", () => {
    expect(sectionHref(HOME.path)).toBe(METADATA.PATH.ROOT);
    expect(sectionHref(USERS.path)).toBe(USERS.path);
  });

  it("marks only the Section you are on, Home included", () => {
    expect(isCurrentSection(USERS.path, USERS.path)).toBe(true);
    expect(isCurrentSection(USERS.path, HOME.path)).toBe(false);
    expect(isCurrentSection(METADATA.PATH.ROOT, HOME.path)).toBe(true);
  });

  it("marks a Section on the pages under it, never Home by prefix", () => {
    const user = `${USERS.path}/abc`;
    expect(isCurrentSection(user, USERS.path)).toBe(true);
    expect(isCurrentSection(user, HOME.path)).toBe(false);
    expect(isCurrentSection(`${USERS.path}x`, USERS.path)).toBe(false);
    expect(currentSection(app, user)).toBe(USERS);
  });

  it("numbers each Section in its App's menu order, Home 01", () => {
    expect(
      app.sections.map((section) => sectionPosition(app, section))
    ).toEqual(["01", "02", "03"]);
  });

  it("numbers a Section's own pages from 01, and the App itself 00", () => {
    expect(subPagePosition(STORAGE, IMAGES)).toBe("01");
    expect(NAVIGATION.APP_POSITION).toBe("00");
  });

  it("finds the Section you are on, Home for any other path", () => {
    expect(currentSection(app, USERS.path)).toBe(USERS);
    expect(currentSection(app, METADATA.PATH.ROOT)).toBe(HOME);
    expect(currentSection(app, "/no-such-section")).toBe(HOME);
  });

  it("opens a Section on its first page, else on itself", () => {
    expect(sectionEntry(STORAGE)).toBe(IMAGES.path);
    expect(sectionEntry(USERS)).toBe(USERS.path);
  });

  it("finds a Section's own page, also on the pages under it", () => {
    expect(currentSubPage(STORAGE, IMAGES.path)).toBe(IMAGES);
    expect(currentSubPage(STORAGE, `${IMAGES.path}/abc`)).toBe(IMAGES);
    expect(currentSection(app, `${IMAGES.path}/new`)).toBe(STORAGE);
  });
});
