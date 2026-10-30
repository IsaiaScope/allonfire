"use client";

import { languageName } from "@allonfire/core/features/i18n/utils/language-name";
import { METADATA } from "@allonfire/core/features/metadata/constants/metadata";
import { AOFBadge } from "@allonfire/ui/components/aof-badge";
import {
  AOFDropdownMenu,
  AOFDropdownMenuGroup,
  AOFDropdownMenuItem,
  AOFDropdownMenuLabel,
  AOFDropdownMenuSegment,
  AOFDropdownMenuSegments,
  AOFDropdownMenuSeparator,
  AOFDropdownMenuTrigger,
} from "@allonfire/ui/components/aof-dropdown-menu";
import {
  AOFSidebarDropdownContent,
  AOFSidebarMenu,
  AOFSidebarMenuButton,
  AOFSidebarMenuItem,
} from "@allonfire/ui/components/aof-sidebar";
import { useAOFColorScheme } from "@allonfire/ui/lib/use-aof-theme-switch";
import {
  IconCaretUpDown,
  IconLogout,
  IconMoonStars,
  IconSun,
} from "@tabler/icons-react";
import { useSearchParams } from "next/navigation";
import { useLocale } from "next-intl";
import type { ReactNode } from "react";
import { languageLinks, usePathname } from "@/features/i18n/navigation";
import { Hanko } from "@/shared/components/hanko";
import { UserAvatar } from "@/shared/components/user-avatar";
import { NAVIGATION } from "../constants/navigation";

export type AccountMenuProps = {
  labels: {
    account: string;
    language: string;
    signOut: string;
    theme: string;
    themeDark: string;
    themeLight: string;
  };
  email: string;
  /** Their picture's address, when they have one. */
  image?: string | null | undefined;
  name: string;
  /** The User's Role in the Back Office, translated. */
  role: string;
  /** The Role's seal (`NAVIGATION.ROLE_SEAL`), pressed beside the User. */
  seal?: string;
};

const { DARK, LIGHT } = METADATA.COLOR_SCHEME;

type ChoiceRowProps = { children: ReactNode; label: string };

/**
 * A row of segments with its label on the left; the segments carry the same
 * label for assistive tech, so the visible one is not read twice.
 */
const ChoiceRow = ({ children, label }: ChoiceRowProps) => (
  <div className="flex items-center justify-between gap-4 px-1.5 py-1">
    <span aria-hidden className="text-muted-foreground text-sm">
      {label}
    </span>
    {children}
  </div>
);

type IdentityProps = Pick<AccountMenuProps, "email" | "image" | "name">;

/** The avatar (the picture, else the name's initial on the Design's
 *  primary), the name over the email. */
const Identity = ({ email, image, name }: IdentityProps) => (
  <>
    <UserAvatar
      className="size-8 rounded-lg group-data-[collapsible=icon]:mx-0.5"
      image={image}
      name={name}
      side={32}
      tone="primary"
    />
    <span className="grid flex-1 text-left text-base leading-tight">
      <span className="truncate font-medium text-foreground">{name}</span>
      <span className="truncate text-xs">{email}</span>
    </span>
  </>
);

/**
 * Who is signed in (shadcn's `sidebar-07` user menu) with their Role's
 * seal, the language and the theme as segmented choices showing the current
 * one, and Sign out, in one menu in the sidebar's footer. Each language is a
 * plain link to the same Section (always prefixed: `languageLinks`). Sign out submits the form the layout rendered outside
 * the popup (`NAVIGATION.FORM.SIGN_OUT`), so it works like any Server Action
 * form. Opens to the right of the sidebar, below it on a phone.
 */
export const AccountMenu = ({
  email,
  image,
  labels,
  name,
  role,
  seal,
}: AccountMenuProps) => {
  const locale = useLocale();
  // The query too: switching language keeps a filtered list filtered.
  const links = languageLinks(
    usePathname(),
    locale,
    useSearchParams().toString()
  );
  const { scheme, setScheme } = useAOFColorScheme();
  return (
    <AOFSidebarMenu>
      <AOFSidebarMenuItem>
        <AOFDropdownMenu>
          <AOFDropdownMenuTrigger
            render={
              <AOFSidebarMenuButton
                aria-label={`${labels.account}, ${name}`}
                size="lg"
              />
            }
          >
            <Identity email={email} image={image} name={name} />
            <IconCaretUpDown aria-hidden className="ml-auto size-4" />
          </AOFDropdownMenuTrigger>
          <AOFSidebarDropdownContent align="end">
            <AOFDropdownMenuGroup>
              <AOFDropdownMenuLabel className="p-0 font-normal">
                {/* The trigger already shows the avatar: here the name, the
                    email and the Role, on a chip and as its seal. */}
                <span className="flex items-center gap-3 px-1.5 py-1.5">
                  <span className="grid flex-1 gap-0.5 text-left text-base leading-tight">
                    <span className="truncate font-medium text-foreground">
                      {name}
                    </span>
                    <span className="truncate text-sm">{email}</span>
                    {role ? <AOFBadge className="mt-1">{role}</AOFBadge> : null}
                  </span>
                  {/* Pressed already: the Sign in card's late stamp, replayed on
                      every opening inside a scrolling popup, read as a jump. */}
                  {seal ? <Hanko seal={seal} size="sm" stamp={false} /> : null}
                </span>
              </AOFDropdownMenuLabel>
            </AOFDropdownMenuGroup>
            <AOFDropdownMenuSeparator />
            <ChoiceRow label={labels.language}>
              <AOFDropdownMenuSegments
                aria-label={labels.language}
                value={locale}
              >
                {links.map(({ attributes, language }) => (
                  <AOFDropdownMenuSegment
                    key={language}
                    // Named in its own language, never read as two letters.
                    label={languageName(language)}
                    render={<a {...attributes} />}
                    value={language}
                  >
                    {language.toUpperCase()}
                  </AOFDropdownMenuSegment>
                ))}
              </AOFDropdownMenuSegments>
            </ChoiceRow>
            <ChoiceRow label={labels.theme}>
              <AOFDropdownMenuSegments
                aria-label={labels.theme}
                onValueChange={setScheme}
                value={scheme}
              >
                <AOFDropdownMenuSegment label={labels.themeLight} value={LIGHT}>
                  <IconSun aria-hidden />
                </AOFDropdownMenuSegment>
                <AOFDropdownMenuSegment label={labels.themeDark} value={DARK}>
                  <IconMoonStars aria-hidden />
                </AOFDropdownMenuSegment>
              </AOFDropdownMenuSegments>
            </ChoiceRow>
            <AOFDropdownMenuSeparator />
            {/* Sign out on the right: where the menu ends. */}
            <AOFDropdownMenuItem
              className="ml-auto w-fit"
              nativeButton
              render={<button form={NAVIGATION.FORM.SIGN_OUT} type="submit" />}
            >
              <IconLogout aria-hidden />
              {labels.signOut}
            </AOFDropdownMenuItem>
          </AOFSidebarDropdownContent>
        </AOFDropdownMenu>
      </AOFSidebarMenuItem>
    </AOFSidebarMenu>
  );
};
