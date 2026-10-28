// @module-tag unit
import { searchQuery } from "../search-query";

const FIELDS = {
  app: ["laura", "back-office"],
  role: ["ADMIN", "USER", "VIEWER"],
} as const;

const search = searchQuery(FIELDS);

describe("searchQuery", () => {
  it("reads known fields in their canonical spelling, the rest as text", () => {
    expect(search.parse("app:laura role:admin isaia")).toEqual({
      app: ["laura"],
      role: ["ADMIN"],
      text: "isaia",
    });
    expect(search.parse("APP:Laura")).toEqual({ app: ["laura"], text: "" });
  });

  it("drops an unknown field or value and collapses whitespace", () => {
    expect(search.parse("role:boss team:x  isa  ia ")).toEqual({
      text: "isa ia",
    });
  });

  it("drops an empty value", () => {
    expect(search.parse("app: role:admin,")).toEqual({
      role: ["ADMIN"],
      text: "",
    });
  });

  it("reads a list of values in table order, each once", () => {
    expect(search.parse("role:viewer,ADMIN,boss,admin")).toEqual({
      role: ["ADMIN", "VIEWER"],
      text: "",
    });
  });

  it("joins the values of a repeated field", () => {
    expect(search.parse("app:back-office app:laura")).toEqual({
      app: ["laura", "back-office"],
      text: "",
    });
  });

  it("reads nothing as empty text", () => {
    expect(search.parse(null)).toEqual({ text: "" });
    expect(search.parse(undefined)).toEqual({ text: "" });
    expect(search.parse("")).toEqual({ text: "" });
  });

  it("reads the text field like any other, beside plain words", () => {
    expect(search.parse("input:isa app:laura")).toEqual({
      app: ["laura"],
      text: "isa",
    });
    expect(search.parse("INPUT:isa bel")).toEqual({ text: "isa bel" });
  });

  it("writes fields in table order, lower-cased, text last", () => {
    expect(
      search.serialize({ app: ["laura"], role: ["ADMIN"], text: "isaia" })
    ).toBe("app:laura role:admin input:isaia");
    expect(search.serialize({ role: ["VIEWER"], text: "" })).toBe(
      "role:viewer"
    );
    expect(search.serialize({ app: [], text: "" })).toBe("");
  });

  it("writes a list in table order, each value once", () => {
    expect(
      search.serialize({ role: ["VIEWER", "ADMIN", "VIEWER"], text: "" })
    ).toBe("role:admin,viewer");
  });

  it("is stable through a round trip", () => {
    for (const raw of [
      "app:laura role:admin isaia",
      "APP:Laura",
      "role:boss team:x  isa  ia ",
      "app: role:admin",
      "role:viewer,admin app:laura,laura",
      "",
    ]) {
      const once = search.serialize(search.parse(raw));
      expect(search.serialize(search.parse(once))).toBe(once);
    }
  });
});
