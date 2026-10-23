// @module-tag unit
import { canonicalizeSource } from "../canonicalize-source";

const CANONICAL: Record<string, string> = {
  "!animate": "animate!",
  "!flex": "flex!",
  "!list": "list!",
  "data-open:rounded-[4px]": "data-open:rounded-lg",
  "rounded-[4px]": "rounded-lg",
  "w-[16px]": "w-4",
};
/** A template literal's placeholder, as source text. */
const HOLE = ["$", "{a}"].join("");
const canonicalize = (candidate: string) => CANONICAL[candidate] ?? candidate;

describe("canonicalizeSource", () => {
  it("rewrites classes in strings, cn() calls and cva() variants", () => {
    const source = [
      'const a = <div className="p-2 rounded-[4px]" />;',
      'const b = cn("w-[16px]", open && "data-open:rounded-[4px]");',
      'const c = cva("flex", { variants: { size: { sm: "w-[16px]" } } });',
    ].join("\n");

    expect(canonicalizeSource(source, "tsx", canonicalize)).toBe(
      [
        'const a = <div className="p-2 rounded-lg" />;',
        'const b = cn("w-4", open && "data-open:rounded-lg");',
        'const c = cva("flex", { variants: { size: { sm: "w-4" } } });',
      ].join("\n")
    );
  });

  it("rewrites only inside strings: `!list` in code is a negation, not a class", () => {
    const source = [
      "if (!stage || !list || !animate || !ready) return;",
      'const a = "!flex";',
      `const b = \`${HOLE} !flex\`;`,
    ].join("\n");
    expect(canonicalizeSource(source, "tsx", canonicalize)).toBe(
      [
        "if (!stage || !list || !animate || !ready) return;",
        'const a = "flex!";',
        `const b = \`${HOLE} flex!\`;`,
      ].join("\n")
    );
  });

  it("keeps offsets right after multi-byte characters", () => {
    const source = 'const k = "⌘"; const a = "rounded-[4px] w-[16px]";';
    expect(canonicalizeSource(source, "tsx", canonicalize)).toBe(
      'const k = "⌘"; const a = "rounded-lg w-4";'
    );
  });

  it("leaves a file with nothing to change byte-for-byte alone", () => {
    const source = 'const a = <div className="p-2 rounded-lg" />;\n';
    expect(canonicalizeSource(source, "tsx", canonicalize)).toBe(source);
  });
});
