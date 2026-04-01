"use client";

import { Button } from "@allonfire/ui/components/button";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

type ThemeToggleProps = {
  size?: "icon-xs" | "icon-sm" | "icon" | "icon-lg";
};

export function ThemeToggle({ size = "icon-sm" }: ThemeToggleProps) {
  const { theme, setTheme } = useTheme();

  return (
    <Button
      aria-label="Toggle theme"
      className="relative"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      size={size}
      type="button"
      variant="secondary"
    >
      <Sun className="size-4 rotate-0 scale-100 transition-transform dark:-rotate-90 dark:scale-0" />
      <Moon className="absolute size-4 rotate-90 scale-0 transition-transform dark:rotate-0 dark:scale-100" />
    </Button>
  );
}
