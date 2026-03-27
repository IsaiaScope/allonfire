import { Images, Upload } from "lucide-react";

export const navItems = [
  { href: "/", label: "Gallery", icon: Images },
  { href: "/upload", label: "Upload", icon: Upload },
] as const;
