// @module-tag unit
import { columnsQuery } from "../columns-query";

const COLUMNS = ["name", "size", "apps", "image", "LAURA"] as const;
const hide = columnsQuery(COLUMNS, { never: ["image"] });

describe("columnsQuery", () => {
  it("reads the listed columns in the table's order", () => {
    expect(hide.parse("apps,size")).toEqual(["size", "apps"]);
  });

  it("drops an unknown, a repeated and a never column", () => {
    expect(hide.parse("size,nope,size,image,apps")).toEqual(["size", "apps"]);
  });

  it("reads a column in the table's spelling, whatever the case", () => {
    expect(hide.parse("laura")).toEqual(["LAURA"]);
  });

  it("reads nothing as none, and writes none as empty", () => {
    expect(hide.parse("")).toEqual([]);
    expect(hide.parse(null)).toEqual([]);
    expect(hide.parse(undefined)).toEqual([]);
    expect(hide.serialize([])).toBe("");
  });

  it("writes in the table's order, each once, never a never column", () => {
    expect(hide.serialize(["apps", "size", "apps", "image"])).toBe("size,apps");
  });

  it("reads an old spelling of a renamed column as its new one", () => {
    const renamed = columnsQuery(["bytes", "apps"] as const, {
      aliases: [{ from: "size", to: "bytes" }],
    });
    expect(renamed.parse("apps,size")).toEqual(["bytes", "apps"]);
    expect(renamed.parse("size,bytes")).toEqual(["bytes"]);
    expect(renamed.serialize(["bytes"])).toBe("bytes");
  });

  it("still drops a never column asked for by its old spelling", () => {
    const renamed = columnsQuery(["picture", "apps"] as const, {
      aliases: [{ from: "image", to: "picture" }],
      never: ["picture"],
    });
    expect(renamed.parse("image,apps")).toEqual(["apps"]);
  });
});
