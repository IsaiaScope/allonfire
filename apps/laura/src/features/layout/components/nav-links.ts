import type { LucideIcon } from "lucide-react";
import { Gamepad2, Images, Settings, Upload } from "lucide-react";

export type NavLink = {
  href: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
};

export type NavSection = {
  labelKey: string;
  icon: LucideIcon;
  links: NavLink[];
};

export function isLinkActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export const navSections: NavSection[] = [
  {
    labelKey: "gallerySection",
    icon: Images,
    links: [
      {
        href: "/",
        labelKey: "gallery",
        descriptionKey: "galleryDescription",
        icon: Images,
      },
      {
        href: "/upload",
        labelKey: "upload",
        descriptionKey: "uploadDescription",
        icon: Upload,
      },
    ],
  },
  {
    labelKey: "gamesSection",
    icon: Gamepad2,
    links: [
      {
        href: "/games",
        labelKey: "games",
        descriptionKey: "gamesDescription",
        icon: Gamepad2,
      },
    ],
  },
  {
    labelKey: "settingsSection",
    icon: Settings,
    links: [
      {
        href: "/settings",
        labelKey: "settings",
        descriptionKey: "settingsDescription",
        icon: Settings,
      },
    ],
  },
];
