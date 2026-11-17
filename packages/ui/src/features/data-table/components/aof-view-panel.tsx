"use client";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@allonfire/shadcn/components/command";
import { type ReactNode, useCallback, useRef, useState } from "react";
import { AOFInputClear } from "../../../shared/components/aof-input-clear";
import { cn } from "../../../shared/utils/utils";
import { type AOFPanelColumn, shownIn } from "../utils/sort-rows";

export type AOFViewPanelProps = {
  /** The columns a list can hide, in the table's order. */
  columns: readonly AOFPanelColumn[];
  /** The ids of the hidden columns. */
  hidden: readonly string[];
  labels: {
    /** The search box's cross. */
    clear: string;
    /** Shown in the list when the search matches nothing. */
    empty: string;
    /** The search box's name and placeholder. */
    search: string;
  };
  onHiddenChange: (next: string[]) => void;
  /** Drawn at the search box's start in place of its own icon (a `--field-tile` tile), as `AOFFaceted` takes it. */
  searchIcon?: ReactNode;
};

/**
 * A list's View tab, as tablecn's view options draw it and as `AOFFaceted`'s
 * list looks: a search box and a row per column that can hide, a check beside
 * each that shows; choosing a row toggles it (showing them all again is the
 * Filter panel's `tabActions`). Rows are as tall as a field, text 16px, icons 20px.
 * Writes the hidden columns, in the table's order.
 */
export const AOFViewPanel = ({
  columns,
  hidden,
  labels,
  onHiddenChange,
  searchIcon,
}: AOFViewPanelProps) => {
  const ids = columns.map(({ id }) => id);
  const toggle = useCallback(
    (id: string) =>
      onHiddenChange(shownIn(ids, hidden, id, hidden.includes(id))),
    [hidden, ids, onHiddenChange]
  );
  const [query, setQuery] = useState("");
  const queryRef = useRef<HTMLInputElement>(null);
  const clearQuery = useCallback(() => {
    setQuery("");
    queryRef.current?.focus();
  }, []);
  return (
    <Command
      className={cn(
        "rounded-lg! bg-transparent p-0 ring-border **:data-[slot=input-group]:h-(--field-height)! [&_[cmdk-item]_svg:not([class*='size-'])]:size-5 [&_[data-slot=input-group]_svg]:size-5 [&_input]:text-base **:[[cmdk-input]]:placeholder:text-muted-foreground **:[[cmdk-item]]:min-h-(--field-height) **:[[cmdk-item]]:px-3 **:[[cmdk-item]]:text-base",
        searchIcon !== undefined &&
          "**:data-[slot=input-group-addon]:hidden **:data-[slot=input-group]:border-input! **:data-[slot=input-group]:bg-transparent! dark:**:data-[slot=input-group]:bg-input/30! **:[[cmdk-input]]:pl-12!"
      )}
    >
      <div className="relative">
        <CommandInput
          aria-label={labels.search}
          className="pr-11"
          onValueChange={setQuery}
          placeholder={labels.search}
          ref={queryRef}
          value={query}
        />
        {query ? (
          <AOFInputClear
            className="top-2 right-2"
            label={labels.clear}
            onClick={clearQuery}
          />
        ) : null}
        {searchIcon === undefined ? null : (
          <span className="pointer-events-none absolute top-2 left-2">
            {searchIcon}
          </span>
        )}
      </div>
      <CommandList>
        <CommandEmpty>{labels.empty}</CommandEmpty>
        <CommandGroup>
          {columns.map(({ id, label }) => (
            <CommandItem
              data-checked={!hidden.includes(id)}
              key={id}
              // The search matches the label, in the page's language.
              keywords={[label]}
              onSelect={toggle}
              value={id}
            >
              {/* A long name wraps at spaces and stops at two lines; a word wider than the row ends in an ellipsis, never split. */}
              <span className="line-clamp-2 min-w-0 max-w-full overflow-hidden text-ellipsis">
                {label}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </Command>
  );
};
