// @module-tag unit
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { SECTION, SECTIONS } from "../../constants/sections";
import {
  currentSection,
  isCurrentSection,
  sectionHref,
  stationNumber,
} from "../sections";

describe("Section helpers", () => {
  it("links Home to the root", () => {
    expect(sectionHref(SECTION.HOME.path)).toBe(METADATA.PATH.ROOT);
    expect(sectionHref(SECTION.USERS.path)).toBe(SECTION.USERS.path);
  });

  it("marks only the Section you are on, Home included", () => {
    const users = sectionHref(SECTION.USERS.path);
    expect(isCurrentSection(users, SECTION.USERS.path)).toBe(true);
    expect(isCurrentSection(users, SECTION.HOME.path)).toBe(false);
    expect(isCurrentSection(METADATA.PATH.ROOT, SECTION.HOME.path)).toBe(true);
  });

  it("marks a Section on the pages under it, never Home by prefix", () => {
    const user = `${SECTION.USERS.path}/abc`;
    expect(isCurrentSection(user, SECTION.USERS.path)).toBe(true);
    expect(isCurrentSection(user, SECTION.HOME.path)).toBe(false);
    expect(isCurrentSection(`${SECTION.USERS.path}x`, SECTION.USERS.path)).toBe(
      false
    );
    expect(currentSection(user)).toBe(SECTION.USERS);
  });

  it("numbers each Section like a station on the line, in menu order", () => {
    expect(SECTIONS.map(stationNumber)).toEqual(["01", "02", "03", "04"]);
  });

  it("finds the Section you are on, Home for any other path", () => {
    expect(currentSection(sectionHref(SECTION.USERS.path))).toBe(SECTION.USERS);
    expect(currentSection(METADATA.PATH.ROOT)).toBe(SECTION.HOME);
    expect(currentSection("/no-such-section")).toBe(SECTION.HOME);
  });
});
