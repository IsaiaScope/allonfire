import { Images, Settings, Upload } from "lucide-react";

export const navItems = [
  { href: "/", labelKey: "gallery" as const, icon: Images },
  { href: "/upload", labelKey: "upload" as const, icon: Upload },
  { href: "/settings", labelKey: "settings" as const, icon: Settings },
] as const;
