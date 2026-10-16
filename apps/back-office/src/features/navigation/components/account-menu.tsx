"use client";

import { AOFButton } from "@allonfire/ui/components/aof-button";
import {
  AOFDropdownMenu,
  AOFDropdownMenuContent,
  AOFDropdownMenuGroup,
  AOFDropdownMenuItem,
  AOFDropdownMenuLabel,
  AOFDropdownMenuSeparator,
  AOFDropdownMenuTrigger,
} from "@allonfire/ui/components/aof-dropdown-menu";
import { useAOFThemeSwitch } from "@allonfire/ui/lib/use-aof-theme-switch";
import { Moon, Sun } from "lucide-react";
import { useLocale } from "next-intl";
import { languageLinks, usePathname } from "@/features/i18n/navigation";
import { NAVIGATION } from "../constants/navigation";

export type AccountMenuProps = {
  labels: {
    account: string;
    language: string;
    signOut: string;
    theme: string;
  };
  name: string;
  /** The User's Role in the Back Office, translated. */
  role: string;
};

/**
 * Who is signed in, the language and theme, and Sign out, in one menu. Each
 * language is a plain link to the same Section (one server render, always
 * prefixed: `languageLinks`). Sign out submits the form the layout rendered
 * outside the popup (`NAVIGATION.FORM.SIGN_OUT`), so it works like any
 * Server Action form.
 */
export const AccountMenu = ({ labels, name, role }: AccountMenuProps) => {
  const links = languageLinks(usePathname(), useLocale());
  const switchTheme = useAOFThemeSwitch();
  return (
    <AOFDropdownMenu>
      <AOFDropdownMenuTrigger
        render={
          <AOFButton
            aria-label={labels.account}
            className="h-10 w-full justify-start gap-2 px-1 group-data-[collapsible=icon]:w-auto max-md:w-auto"
            variant="ghost"
          />
        }
      >
        {/* The name's initial on a black tile, like a field's pictogram. */}
        <span
          aria-hidden
          className="flex size-8 shrink-0 items-center justify-center rounded-md bg-foreground font-semibold text-background text-sm"
        >
          {name.charAt(0).toUpperCase()}
        </span>
        <span className="truncate group-data-[collapsible=icon]:hidden max-md:hidden">
          {name}
        </span>
      </AOFDropdownMenuTrigger>
      <AOFDropdownMenuContent align="end">
        <AOFDropdownMenuGroup>
          <AOFDropdownMenuLabel>
            <span className="block font-medium text-foreground">{name}</span>
            <span className="block text-muted-foreground">{role}</span>
          </AOFDropdownMenuLabel>
        </AOFDropdownMenuGroup>
        <AOFDropdownMenuSeparator />
        <AOFDropdownMenuGroup>
          <AOFDropdownMenuLabel>{labels.language}</AOFDropdownMenuLabel>
          {links.map(({ attributes, language }) => (
            <AOFDropdownMenuItem key={language} render={<a {...attributes} />}>
              {language.toUpperCase()}
            </AOFDropdownMenuItem>
          ))}
        </AOFDropdownMenuGroup>
        {/* Stays open, so the switch shows. Each icon shows in the theme it
            switches away from, by the `.dark` class, as AOFThemeToggle does. */}
        <AOFDropdownMenuItem closeOnClick={false} onClick={switchTheme}>
          <Moon aria-hidden className="dark:hidden" />
          <Sun aria-hidden className="hidden dark:block" />
          {labels.theme}
        </AOFDropdownMenuItem>
        <AOFDropdownMenuSeparator />
        <AOFDropdownMenuItem
          nativeButton
          render={<button form={NAVIGATION.FORM.SIGN_OUT} type="submit" />}
        >
          {labels.signOut}
        </AOFDropdownMenuItem>
      </AOFDropdownMenuContent>
    </AOFDropdownMenu>
  );
};
