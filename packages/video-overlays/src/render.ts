import { fileURLToPath } from "node:url";
import { projectFolderFromArgs, renderOverlayPackage } from "./render-overlays";

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const projectFolder = projectFolderFromArgs(process.argv.slice(2));
  if (!projectFolder) {
    process.stderr.write("Usage: pnpm render -- <project-folder>\n");
    process.exit(1);
  }
  renderOverlayPackage(projectFolder).catch((err) => {
    process.stderr.write(
      `${err instanceof Error ? err.message : String(err)}\n`
    );
    process.exit(1);
  });
}
