"use client";

import {
  Faceted,
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
import { IconCaretUpDown, IconRefresh } from "@tabler/icons-react";
import { useCallback, useState } from "react";
import { cn } from "../lib/utils";
import { AOFButton } from "./aof-button";

/** Every word a Faceted list says, in the page's language. */
export type AOFFacetedLabels = {
  /** Shown in the list when the search matches nothing. */
  empty: string;
  /** On the trigger while nothing is chosen. */
  placeholder: string;
  /** The row that clears the choice. */
  reset: string;
  /** The search box's placeholder and name. */
  search: string;
  /** The trigger's accessible name. */
  trigger: string;
};

export type AOFFacetedItem<V extends string> = { label: string; value: V };

export type AOFFacetedProps<V extends string> = {
  className?: string | undefined;
  items: readonly AOFFacetedItem<V>[];
  labels: AOFFacetedLabels;
  /** The new choice, or null when it was cleared. */
  onValueChange: (value: V | null) => void;
  value: V | null;
};

/**
 * One choice from a searchable list (DiceUI's Faceted): a trigger naming the
 * choice, a popup with a search box, a check beside the chosen option, and a
 * Reset row while something is chosen. Choosing the chosen option again
 * clears it too. Single choice only; every word comes from `labels`.
 */
export const AOFFaceted = <V extends string>({
  className,
  items,
  labels,
  onValueChange,
  value,
}: AOFFacetedProps<V>) => {
  const [open, setOpen] = useState(false);
  const choose = useCallback(
    (picked: string) => {
      const item = items.find((candidate) => candidate.value === picked);
      onValueChange(item && item.value !== value ? item.value : null);
      setOpen(false);
    },
    [items, onValueChange, value]
  );
  const reset = useCallback(() => {
    onValueChange(null);
    setOpen(false);
  }, [onValueChange]);
  const chosen = items.find((item) => item.value === value);
  return (
    // Controlled with "" for no choice: DiceUI reads `undefined` as
    // uncontrolled, and reports a cleared choice to nobody.
    <Faceted
      items={[...items]}
      onOpenChange={setOpen}
      open={open}
      value={value ?? ""}
    >
      <FacetedTrigger
        aria-label={labels.trigger}
        render={
          <AOFButton
            className={cn("w-36 justify-between font-normal", className)}
            variant="outline"
          />
        }
      >
        <span className={cn("truncate", !chosen && "text-muted-foreground")}>
          {chosen?.label ?? labels.placeholder}
        </span>
        <IconCaretUpDown className="text-muted-foreground" />
      </FacetedTrigger>
      <FacetedContent>
        <FacetedInput aria-label={labels.search} placeholder={labels.search} />
        <FacetedList>
          <FacetedEmpty>{labels.empty}</FacetedEmpty>
          <FacetedGroup>
            {items.map((item) => (
              <FacetedItem
                key={item.value}
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
