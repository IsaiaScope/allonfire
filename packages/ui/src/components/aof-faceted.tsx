"use client";

import {
  Faceted,
  FacetedBadge,
  FacetedClear,
  FacetedContent,
  FacetedEmpty,
  FacetedGroup,
  FacetedInput,
  FacetedItem,
  FacetedItemIndicator,
  FacetedList,
  FacetedTrigger,
} from "@allonfire/shadcn/components/faceted";
import { IconCirclePlus, IconCircleX, IconRefresh } from "@tabler/icons-react";
import { cva } from "class-variance-authority";
import {
  type MouseEvent,
  type ReactNode,
  useCallback,
  useRef,
  useState,
} from "react";
import type { ComponentPropsWithoutChildren } from "../lib/types";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";
import { AOFControlBarSeparator } from "./aof-control-bar";
import { AOFInputClear } from "./aof-input-clear";
import { AOFTooltip } from "./aof-tooltip";

/** Every word a Faceted list says, in the page's language. */
export type AOFFacetedLabels = {
  /** The button that empties the search box. */
  clear: string;
  /** Shown in the list when the search matches nothing. */
  empty: string;
  /** The row that clears the list. */
  reset: string;
  /** The search box's placeholder and name. */
  search: string;
  /** The one badge once more than two values are chosen: `3 selected`. */
  selected: (count: number) => string;
  /** The list's name, always on its trigger. */
  trigger: string;
};

/** The most chosen values drawn one badge each; past it, one badge counts them. */
const BADGES_MAX = 2;

/**
 * The popup at its trigger's size: beside a form's fields (`field`) its search
 * box and rows are as tall as a field (`--field-height`), text 16px, icons 20px, and the
 * Reset row a step quieter (36px, 14px, muted). shadcn draws the search box
 * `h-8!`, hence `!`. Edged like a field, so a list opened over a panel of the
 * same colour stands apart from it. Its placeholder is muted text, not
 * shadcn's faded foreground (3:1 on the box). With `tiled`, the search box's
 * own icon gives way to the caller's `searchIcon` and the box takes a field's
 * edge and ground, so the tile stands out on it as in the page's search.
 */
const popup = cva(
  "w-(--anchor-width) min-w-56 ring-border **:[[cmdk-input]]:placeholder:text-muted-foreground",
  {
    variants: {
      size: {
        field:
          "**:data-[slot=input-group]:h-(--field-height)! **:data-[slot=faceted-clear]:min-h-9! **:data-[slot=faceted-clear]:text-muted-foreground **:data-[slot=faceted-clear]:text-sm! [&_[cmdk-item]_svg:not([class*='size-'])]:size-5 [&_[data-slot=faceted-clear]_svg]:size-4! [&_[data-slot=input-group]_svg]:size-5 [&_input]:text-base **:[[cmdk-item]]:min-h-(--field-height) **:[[cmdk-item]]:px-3 **:[[cmdk-item]]:text-base",
        other: "",
      },
      tiled: {
        false: "",
        true: "**:data-[slot=input-group-addon]:hidden **:data-[slot=input-group]:border-input! **:data-[slot=input-group]:bg-transparent! dark:**:data-[slot=input-group]:bg-input/30! **:[[cmdk-input]]:pl-12!",
      },
    },
  }
);

/** A chosen badge at its trigger's size: 14px text beside a form's fields. */
const badge = cva("min-w-0", {
  variants: { size: { field: "h-6 text-sm", other: "" } },
});

export type AOFFacetedItem<V extends string> = { label: string; value: V };

/** DiceUI's Faceted root (`open`, `onOpenChange`, ...), always several values,
 *  typed by `V`. */
export type AOFFacetedProps<V extends string> = Omit<
  ComponentPropsWithoutChildren<typeof Faceted<true>>,
  "defaultValue" | "items" | "multiple" | "onValueChange" | "value"
> & {
  items: readonly AOFFacetedItem<V>[];
  labels: AOFFacetedLabels;
  /** Every value chosen after a change, in the order they were chosen. */
  onValueChange: (value: V[]) => void;
  /** Drawn at the search box's start in place of its own icon, a `--field-tile` tile
   *  at the `field` size. */
  searchIcon?: ReactNode;
  /** The trigger's own props: its classes, its size (`field` beside a
   *  form's fields, which sizes the badges and the list too). */
  triggerProps?: ComponentPropsWithoutChildren<typeof AOFButton>;
  value: readonly V[];
};

/**
 * Any number of values from a searchable list (DiceUI's Faceted), drawn as
 * tablecn's filter: a dashed button naming the list with a plus; once
 * something is chosen, a cross that clears it, a divider and a badge per
 * value (one counting them past two). The popup has a search box, a check
 * beside each chosen value, and a Reset row while anything is chosen; it
 * stays open while choosing, and choosing a chosen value takes it out. Every
 * word comes from `labels`.
 */
export const AOFFaceted = <V extends string>({
  items,
  labels,
  onValueChange,
  searchIcon,
  triggerProps,
  value,
  ...props
}: AOFFacetedProps<V>) => {
  const choose = useCallback(
    (picked: string) => {
      const item = items.find((candidate) => candidate.value === picked);
      if (!item) {
        return;
      }
      onValueChange(
        value.includes(item.value)
          ? value.filter((held) => held !== item.value)
          : [...value, item.value]
      );
    },
    [items, onValueChange, value]
  );
  const reset = useCallback(() => onValueChange([]), [onValueChange]);
  // The cross inside the trigger clears without opening the list; the
  // keyboard clears through the list's Reset row.
  const clear = useCallback(
    (event: MouseEvent) => {
      event.stopPropagation();
      onValueChange([]);
    },
    [onValueChange]
  );
  // The search box's text, held here so its cross can empty it.
  const [query, setQuery] = useState("");
  const queryRef = useRef<HTMLInputElement>(null);
  const clearQuery = useCallback(() => {
    setQuery("");
    queryRef.current?.focus();
  }, []);
  const chosen = items.filter((item) => value.includes(item.value));
  const fit = triggerProps?.size === "field" ? "field" : "other";
  return (
    <Faceted {...props} items={[...items]} multiple value={[...value]}>
      <FacetedTrigger
        // DiceUI spreads its trigger (`justify-between`); this one reads from
        // the left, and only the badges give way when room is short.
        className="justify-start gap-1.5"
        render={
          <AOFButton
            variant="outline"
            {...triggerProps}
            className={cn("border-dashed font-normal", triggerProps?.className)}
          />
        }
      >
        {chosen.length > 0 ? (
          // A pointer's shortcut, so a tip names it.
          <AOFTooltip contentProps={{ side: "left" }} label={labels.reset}>
            <span
              aria-hidden="true"
              className="text-muted-foreground transition-colors hover:text-foreground"
              onClick={clear}
            >
              <IconCircleX />
            </span>
          </AOFTooltip>
        ) : (
          <IconCirclePlus aria-hidden className="text-muted-foreground" />
        )}
        <span className="shrink-0">{labels.trigger}</span>
        {chosen.length > 0 ? (
          <>
            <AOFControlBarSeparator className="mx-0.5" />
            {chosen.length > BADGES_MAX ? (
              <FacetedBadge className={badge({ size: fit })}>
                <span className="truncate">
                  {labels.selected(chosen.length)}
                </span>
              </FacetedBadge>
            ) : (
              chosen.map((item) => (
                <FacetedBadge className={badge({ size: fit })} key={item.value}>
                  <span className="truncate">{item.label}</span>
                </FacetedBadge>
              ))
            )}
          </>
        ) : null}
      </FacetedTrigger>
      <FacetedContent
        className={popup({ size: fit, tiled: searchIcon !== undefined })}
      >
        <div className="relative">
          <FacetedInput
            aria-label={labels.search}
            className="pr-11"
            onValueChange={setQuery}
            placeholder={labels.trigger}
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
        <FacetedList>
          <FacetedEmpty>{labels.empty}</FacetedEmpty>
          <FacetedGroup>
            {items.map((item) => (
              <FacetedItem
                key={item.value}
                // The search matches the label, in the page's language.
                keywords={[item.label]}
                onSelect={choose}
                value={item.value}
              >
                {item.label}
                <FacetedItemIndicator />
              </FacetedItem>
            ))}
          </FacetedGroup>
          <FacetedClear onSelect={reset}>
            <IconRefresh />
            {labels.reset}
          </FacetedClear>
        </FacetedList>
      </FacetedContent>
    </Faceted>
  );
};
