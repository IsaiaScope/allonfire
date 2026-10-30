"use client";

import {
  USER,
  USER_SEARCH,
} from "@allonfire/auth/features/users/constants/users";
import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { AOFInput } from "@allonfire/ui/components/aof-input";
import { AOFInputClear } from "@allonfire/ui/components/aof-input-clear";
import { AOFTooltip } from "@allonfire/ui/components/aof-tooltip";
import { cn } from "@allonfire/ui/lib/utils";
import { IconSearch, IconUserPlus } from "@tabler/icons-react";
import { useTranslations } from "next-intl";
import { useQueryStates } from "nuqs";
import {
  type ChangeEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@/features/i18n/navigation";
import { USERS } from "../constants/users";
import { usersParams } from "../constants/users-params";
import { newUserHref } from "../utils/user-href";
import {
  pictogramTile,
  ToolbarActionBody,
  tiledControl,
  toolbarActionClass,
} from "./toolbar-action";
import { type UserSearch, UsersFilters } from "./users-filters";

/** Typed text as the address will hold it. */
const tidy = (text: string) =>
  text.trim().split(PATTERN.WHITESPACE).join(SEPARATOR.WORD);

/**
 * What the box keeps of `typed` once typing rests: its words, and each
 * `field:value` part that reads as no filter yet (`app:`, `app:lau`, a field
 * it does not know), so a field still being typed never vanishes. A whole
 * field (`app:laura`) leaves the box for its filter.
 */
const keptInBox = (typed: string) =>
  [
    USER_SEARCH.parse(typed).text,
    ...tidy(typed)
      .split(SEPARATOR.WORD)
      .filter(
        (part) =>
          part.includes(SEPARATOR.FIELD) &&
          USER_SEARCH.serialize(USER_SEARCH.parse(part)) === ""
      ),
  ]
    .filter(Boolean)
    .join(SEPARATOR.WORD);

/**
 * The list's controls: an email search box, then the Filter button
 * (`UsersFilters`), all written into the one `search` param (ADR 0026), any change going back to the first page;
 * on the far right, the actions on the selection (`children`), then the
 * primary way to add a User.
 */
export const UsersToolbar = ({ children }: { children?: ReactNode }) => {
  const t = useTranslations();
  const [params, setParams] = useQueryStates(usersParams);
  const raw = params[USER.PARAM.SEARCH];
  const search = useMemo(() => USER_SEARCH.parse(raw), [raw]);
  const [draft, setDraft] = useState(search.text);
  // The address changed under the box (Back, a link): the box follows it,
  // unless its words already say the same (a field still being typed stays).
  const [seen, setSeen] = useState(search.text);
  if (search.text !== seen) {
    setSeen(search.text);
    if (USER_SEARCH.parse(draft).text !== search.text) {
      setDraft(search.text);
    }
  }

  // Replaces the history entry: Back should not walk through each search.
  // Written for the page key too, which would otherwise push.
  const write = useCallback(
    (next: UserSearch) =>
      setParams(
        {
          [USER.PARAM.PAGE]: null,
          [USER.PARAM.SEARCH]: USER_SEARCH.serialize(next) || null,
        },
        USERS.HISTORY.SEARCH
      ),
    [setParams]
  );

  useEffect(() => {
    if (tidy(draft) === search.text) {
      return;
    }
    // A field typed in the box (`app:laura`) becomes its filter, and the
    // box keeps only the words.
    const timer = setTimeout(() => {
      write({ ...search, ...USER_SEARCH.parse(draft) });
      setDraft(keptInBox(draft));
    }, USERS.TYPING_REST_MS);
    return () => clearTimeout(timer);
  }, [draft, search, write]);

  const type = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => setDraft(event.target.value),
    []
  );
  // The cross empties the box and hands it the focus back, to type again.
  const inputRef = useRef<HTMLInputElement>(null);
  const clearDraft = useCallback(() => {
    setDraft("");
    inputRef.current?.focus();
  }, []);
  // Laid out by its own width, which the sidebar decides: narrow, the search
  // takes the first row and Filter the second's left, the actions its right;
  // wide (56rem), everything is one row. Every control is as tall as a form's
  // field (`--field-height`: 40px under a mouse, 44px on touch); the search and Filter open on the toolbar's pictogram
  // tile.
  return (
    <div className="@container">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-0 flex-1 @4xl:basis-0 basis-full">
          <span
            aria-hidden="true"
            className={cn(
              pictogramTile(),
              "pointer-events-none absolute top-1 left-1"
            )}
          >
            <IconSearch />
          </span>
          <AOFInput
            aria-label={t("Users.search.label")}
            className={cn(
              tiledControl(),
              "pr-12 pl-13 [&::-webkit-search-cancel-button]:appearance-none"
            )}
            onChange={type}
            placeholder={t("Users.search.label")}
            ref={inputRef}
            type="search"
            value={draft}
          />
          {draft ? (
            <AOFInputClear
              label={t("Users.search.clear")}
              onClick={clearDraft}
            />
          ) : null}
        </div>
        <UsersFilters search={search} write={write} />
        <div className="ml-auto flex gap-2">
          {children}
          {/* A link drawn as the primary action: it navigates, and opens in
              a new tab too. */}
          <AOFTooltip label={t("Users.add.button")}>
            <Link
              aria-label={t("Users.add.button")}
              className={toolbarActionClass("responsive")}
              href={newUserHref()}
            >
              <ToolbarActionBody
                icon={<IconUserPlus aria-hidden />}
                kanjiProps={{ kanji: USERS.ADD_KANJI }}
                label={t("Users.add.button")}
                shape="responsive"
              />
            </Link>
          </AOFTooltip>
        </div>
      </div>
    </div>
  );
};
