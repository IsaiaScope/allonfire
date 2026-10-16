import type { ComponentPropsWithoutChildren } from "@allonfire/ui/lib/types";
import { cn } from "@allonfire/ui/lib/utils";
import { cva } from "class-variance-authority";
import { Languages } from "lucide-react";
import { useLocale } from "next-intl";
import { languageLinks } from "@/features/i18n/navigation";

const link = cva(
  "rounded-md px-3 py-1 font-led outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring",
  {
    variants: {
      current: {
        false: "text-muted-foreground hover:bg-muted hover:text-foreground",
        // The board's amber on black: the language the page speaks now.
        true: "bg-led-panel text-led",
      },
    },
  }
);

/**
 * One link per language to the same page (`languageLinks`), marking the
 * current one with `aria-current`. Plain links: switching is one server
 * render, no script.
 */
export type LanguageSwitchProps = ComponentPropsWithoutChildren<"nav"> & {
  /** The App path every language links to, without a locale prefix. */
  href: string;
  /** The accessible name of the navigation. */
  label: string;
};

export const LanguageSwitch = ({
  className,
  href,
  label,
  ...props
}: LanguageSwitchProps) => {
  const locale = useLocale();
  return (
    <nav
      aria-label={label}
      className={cn("flex items-center gap-0.5 text-sm", className)}
      {...props}
    >
      <Languages
        aria-hidden
        className="mr-0.5 ml-2 size-4 text-muted-foreground"
      />
      {languageLinks(href, locale).map(({ attributes, current, language }) => (
        <a {...attributes} className={link({ current })} key={language}>
          {language.toUpperCase()}
        </a>
      ))}
    </nav>
  );
};
