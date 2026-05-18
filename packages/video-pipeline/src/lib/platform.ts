export type Platform = "macos" | "linux" | "windows";

export function detectPlatform(
  nodePlatform: string = process.platform
): Platform {
  switch (nodePlatform) {
    case "darwin":
      return "macos";
    case "linux":
      return "linux";
    case "win32":
      return "windows";
    default:
      throw new Error(`Unsupported platform: ${nodePlatform}`);
  }
}
