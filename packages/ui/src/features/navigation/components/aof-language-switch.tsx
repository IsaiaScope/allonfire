import { aofBaseNavigation } from "@allonfire/core/features/next/i18n/utils/aof-base-navigation";
import { IconLanguage } from "@tabler/icons-react";
import { useLocale } from "next-intl";
import type { ComponentPropsWithoutChildren } from "../../../shared/types/types";
import { cn } from "../../../shared/utils/utils";

/**
 * One link per language to the same page (`languageLinks`), marking the
 * current one with `aria-current`. Plain links: switching is one server
 * render, no script. A Server Component; how a link looks is the Design's.
 */
export type AOFLanguageSwitchProps = ComponentPropsWithoutChildren<"nav"> & {
  /** The App path every language links to, without a locale prefix. */
  href: string;
  /** The accessible name of the navigation. */
  label: string;
  /** The look of a link: the language the page speaks now, and the others. */
  linkClassName: { current: string; idle: string };
};

export const AOFLanguageSwitch = ({
  className,
  href,
  label,
  linkClassName,
  ...props
}: AOFLanguageSwitchProps) => {
  const locale = useLocale();
  return (
    <nav
      aria-label={label}
      className={cn("flex items-center gap-0.5 text-sm", className)}
      {...props}
    >
      <IconLanguage
        aria-hidden
        className="mr-0.5 ml-2 size-4 text-muted-foreground"
      />
      {aofBaseNavigation
        .languageLinks(href, locale)
        .map(({ attributes, current, language }) => (
          <a
            {...attributes}
            className={current ? linkClassName.current : linkClassName.idle}
            key={language}
          >
            {language.toUpperCase()}
          </a>
        ))}
    </nav>
  );
};
