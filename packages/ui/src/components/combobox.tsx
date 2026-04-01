"use client";

import { cn } from "@allonfire/ui/lib/utils";
import { Command as CommandPrimitive } from "cmdk";
import { CheckIcon, ChevronsUpDownIcon, SearchIcon } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

type ComboboxOption = {
  value: string;
  label: string;
};

type ComboboxProps = {
  options: ComboboxOption[];
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
};

function Combobox({
  options,
  value,
  onValueChange,
  placeholder = "Select...",
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  className,
  id,
}: ComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedLabel = options.find((o) => o.value === value)?.label ?? "";

  const handleSelect = useCallback(
    (selectedValue: string) => {
      onValueChange(selectedValue);
      setOpen(false);
      setSearch("");
    },
    [onValueChange]
  );

  return (
    <Popover
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setSearch("");
        }
      }}
      open={open}
    >
      <PopoverTrigger asChild disabled={disabled}>
        <button
          aria-expanded={open}
          className={cn(
            "flex h-9 w-full items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow] focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30 dark:hover:bg-input/50",
            !value && "text-muted-foreground",
            className
          )}
          id={id}
          type="button"
        >
          <span className="truncate">{selectedLabel || placeholder}</span>
          <ChevronsUpDownIcon className="size-4 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) p-0"
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          inputRef.current?.focus();
        }}
      >
        <CommandPrimitive>
          <div className="flex items-center gap-2 border-b px-3">
            <SearchIcon className="size-4 shrink-0 text-muted-foreground" />
            <CommandPrimitive.Input
              className="flex h-9 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              onValueChange={setSearch}
              placeholder={searchPlaceholder}
              ref={inputRef}
              value={search}
            />
          </div>
          <CommandPrimitive.List className="max-h-80 overflow-y-auto p-1">
            <CommandPrimitive.Empty className="px-2 py-6 text-center text-muted-foreground text-sm">
              {emptyMessage}
            </CommandPrimitive.Empty>
            {options.map((option) => (
              <CommandPrimitive.Item
                className="relative flex cursor-default select-none items-center gap-2 rounded-sm px-2 py-1.5 pr-8 text-sm outline-hidden data-[selected=true]:bg-accent data-[selected=true]:text-accent-foreground"
                key={option.value}
                onSelect={() => handleSelect(option.value)}
                value={option.label}
              >
                <span className="truncate">{option.label}</span>
                {value === option.value && (
                  <CheckIcon className="absolute right-2 size-4" />
                )}
              </CommandPrimitive.Item>
            ))}
          </CommandPrimitive.List>
        </CommandPrimitive>
      </PopoverContent>
    </Popover>
  );
}

export { Combobox, type ComboboxOption };
