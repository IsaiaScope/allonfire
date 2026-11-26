import { parseArgs } from "node:util";
import { unitFolders } from "./affected";
import { alignVersions, applyRelease } from "./release-workspace";
import { affectedSince } from "./turbo-affected";

// `/iso-push`'s release hook (`.iso/release-hook`) calls this; the contract is
// in the package README. Prints one changed manifest per line.
const { values } = parseArgs({
  options: {
    align: { type: "string" },
    from: { type: "string" },
    next: { type: "string" },
    previous: { type: "string" },
    root: { type: "string" },
  },
});

const { align, from, next, previous, root } = values;

if (!root) {
  throw new Error("--root <dir> is required");
}

const changed = align
  ? alignVersions({ root, version: align })
  : applyRelease({
      deployed: unitFolders(affectedSince(root, from ?? "")),
      from: from ?? "",
      next: next ?? "",
      previous: previous ?? "",
      root,
    });

if (changed.length > 0) {
  process.stdout.write(`${changed.join("\n")}\n`);
}
