import { z } from "zod";

export const platformEnum = z.enum(["TWITTER", "LINKEDIN", "YOUTUBE"]);

export const PLATFORM_CONFIG: Record<
  string,
  { label: string; icon: string; charLimit: number }
> = {
  TWITTER: { label: "Twitter / X", icon: "\u{1D54F}", charLimit: 280 },
  LINKEDIN: { label: "LinkedIn", icon: "in", charLimit: 3000 },
  YOUTUBE: { label: "YouTube", icon: "\u25B6", charLimit: 500 },
};
