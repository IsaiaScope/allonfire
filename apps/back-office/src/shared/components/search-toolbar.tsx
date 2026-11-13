"use client";

import { PATTERN } from "@allonfire/core/shared/constants/patterns";
import { SEPARATOR } from "@allonfire/core/shared/constants/separators";
import { AOFInput } from "@allonfire/ui/features/form/components/aof-input";
import {
  AOFInputClear,
  aofInputWithEnd,
} from "@allonfire/ui/shared/components/aof-input-clear";
import { AOFTooltip } from "@allonfire/ui/shared/components/aof-tooltip";
import { cn } from "@allonfire/ui/shared/utils/utils";
import { IconSearch } from "@tabler/icons-react";
import {
  type ChangeEvent,
  type ComponentProps,
  type ComponentType,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { Link } from "@/features/i18n/navigation";
import {
  pictogramTile,
  ToolbarActionBody,
  tiledControl,
  toolbarActionClass,
  toolbarLayout,
} from "@/shared/components/toolbar-action";

/** How a list reads and writes its one `search` param (ADR 0026): core's `searchQuery`. */
type SearchCodec<Search extends { text: string }> = {
  parse: (raw: string) => Search;
  serialize: (search: Search) => string;
};

/** Typed text as the address will hold it. */
const tidy = (text: string) =>
  text.trim().split(PATTERN.WHITESPACE).join(SEPARATOR.WORD);

/**
 * What the box keeps of `typed` once typing rests: its words, and each
 * `field:value` part that reads as no filter yet (`app:`, `app:lau`, a field
 * it does not know), so a field still being typed never vanishes. A whole
 * field (`app:laura`) leaves the box for its filter.
 */
const keptInBox = <Search extends { text: string }>(
  codec: SearchCodec<Search>,
  typed: string
) =>
  [
    codec.parse(typed).text,
    ...tidy(typed)
      .split(SEPARATOR.WORD)
      .filter(
        (part) =>
          part.includes(SEPARATOR.FIELD) &&
          codec.serialize(codec.parse(part)) === ""
      ),
  ]
    .filter(Boolean)
    .join(SEPARATOR.WORD);

/**
 * A list's controls: a search box, then the Filter button (`Filters`), all
 * written into the one `search` param (ADR 0026), any change going back to the
 * first page; on the far right, the actions on the selection (`children`),
 * then the primary way to add (`add`).
 */
export const SearchToolbar = <Search extends { text: string }>({
  add,
  children,
  clearLabel,
  codec,
  Filters,
  raw,
  searchLabel,
  typingRestMs,
  write: writeParam,
}: {
  /** The primary action, a link drawn as a button: it navigates, and opens in a new tab too. */
  add: {
    href: ComponentProps<typeof Link>["href"];
    icon: ReactNode;
    kanji: string;
    label: string;
  };
  children?: ReactNode;
  clearLabel: string;
  codec: SearchCodec<Search>;
  /** The Filter button, given the search read and how to write a change. */
  Filters: ComponentType<{ search: Search; write: (next: Search) => void }>;
  /** The `search` param as the address holds it. */
  raw: string;
  searchLabel: string;
  /** How long typing rests before it is written. */
  typingRestMs: number;
  /** Writes the search serialized (null when empty) and goes back to the first page, replacing the history entry: Back should not walk through each search. */
  write: (serialized: string | null) => void;
}) => {
  const search = useMemo(() => codec.parse(raw), [codec, raw]);
  const [draft, setDraft] = useState(search.text);
  // The address changed under the box (Back, a link): the box follows it,
  // unless its words already say the same (a field still being typed stays).
  const [seen, setSeen] = useState(search.text);
  if (search.text !== seen) {
    setSeen(search.text);
    if (codec.parse(draft).text !== search.text) {
      setDraft(search.text);
    }
  }

  const write = useCallback(
    (next: Search) => writeParam(codec.serialize(next) || null),
    [codec, writeParam]
  );

  useEffect(() => {
    if (tidy(draft) === search.text) {
      return;
    }
    // A field typed in the box (`app:laura`) becomes its filter, and the
    // box keeps only the words.
    const timer = setTimeout(() => {
      write({ ...search, ...codec.parse(draft) });
      setDraft(keptInBox(codec, draft));
    }, typingRestMs);
    return () => clearTimeout(timer);
  }, [codec, draft, search, typingRestMs, write]);

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
  // field (`--field-height`: 40px under a mouse, 44px on touch); the search
  // and Filter open on the toolbar's pictogram tile.
  return (
    <div className="@container">
      <div className={toolbarLayout({ part: "row" })}>
        <div className={cn(toolbarLayout({ part: "search" }), "relative")}>
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
            aria-label={searchLabel}
            className={cn(
              tiledControl(),
              aofInputWithEnd(),
              "pl-13 [&::-webkit-search-cancel-button]:appearance-none"
            )}
            onChange={type}
            placeholder={searchLabel}
            ref={inputRef}
            type="search"
            value={draft}
          />
          {draft ? (
            <AOFInputClear label={clearLabel} onClick={clearDraft} />
          ) : null}
        </div>
        <Filters search={search} write={write} />
        <div className={toolbarLayout({ part: "actions" })}>
          {children}
          <AOFTooltip label={add.label}>
            <Link
              aria-label={add.label}
              className={toolbarActionClass("responsive")}
              href={add.href}
            >
              <ToolbarActionBody
                icon={add.icon}
                kanjiProps={{ kanji: add.kanji }}
                label={add.label}
                shape="responsive"
              />
            </Link>
          </AOFTooltip>
        </div>
      </div>
    </div>
  );
};
