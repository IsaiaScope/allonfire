import type { LucideIcon } from "lucide-react";
import {
  BrainCircuit,
  CircleHelp,
  Gamepad2,
  Heart,
  Images,
  Settings,
  Upload,
} from "lucide-react";

export type NavLink = {
  href: string;
  labelKey: string;
  descriptionKey: string;
  icon: LucideIcon;
  viewerRestricted?: boolean;
};

export type NavSection = {
  labelKey: string;
  icon: LucideIcon;
  links: NavLink[];
};

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
        href: "/favorites",
        labelKey: "favorites",
        descriptionKey: "favoritesDescription",
        icon: Heart,
      },
      {
        href: "/upload",
        labelKey: "upload",
        descriptionKey: "uploadDescription",
        icon: Upload,
        viewerRestricted: true,
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
      {
        href: "/games/memory",
        labelKey: "memory",
        descriptionKey: "memoryNavDescription",
        icon: BrainCircuit,
      },
      {
        href: "/games/quiz",
        labelKey: "quiz",
        descriptionKey: "quizNavDescription",
        icon: CircleHelp,
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

const allHrefs = navSections.flatMap((s) => s.links.map((l) => l.href));

export function isLinkActive(pathname: string, href: string) {
  if (href === pathname) {
    return true;
  }
  if (href === "/") {
    return false;
  }
  if (!pathname.startsWith(`${href}/`)) {
    return false;
  }
  // Only highlight parent if no child link matches more specifically
  return !allHrefs.some(
    (other) =>
      other !== href &&
      other.startsWith(`${href}/`) &&
      pathname.startsWith(other)
  );
}
