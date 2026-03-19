"use client";

import { useMounted } from "@allonfire/hooks/use-mounted";
import { Input } from "@allonfire/ui/components/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@allonfire/ui/components/select";
import { Loader2, Search } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";

export const CATEGORIES = [
  { value: "", label: "All" },
  { value: "NEWS", label: "News" },
  { value: "MEME_WORTHY", label: "Meme Worthy" },
  { value: "LEARNING", label: "Learning" },
  { value: "TOOL_RELEASE", label: "Tool Release" },
  { value: "AI_UPDATE", label: "AI Update" },
] as const;

type DiscoverFiltersProps = {
  category: string;
  deleteButton?: ReactNode;
  onCategoryChange: (category: string) => void;
  onSearchChange: (search: string) => void;
  onSortChange: (sort: string) => void;
  search: string;
  sort: string;
};

export function DiscoverFilters({
  category,
  deleteButton,
  onCategoryChange,
  onSearchChange,
  onSortChange,
  search,
  sort,
}: DiscoverFiltersProps) {
  const [localSearch, setLocalSearch] = useState(search);
  const mounted = useMounted();

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange]);

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      {/* Search + Sort row */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            onChange={(e) => setLocalSearch(e.target.value)}
            placeholder="Search topics..."
            value={localSearch}
          />
        </div>
        <div className="hidden items-center gap-2 sm:flex">
          {mounted ? (
            <Select onValueChange={onSortChange} value={sort}>
              <SelectTrigger className="w-[150px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest first</SelectItem>
                <SelectItem value="oldest">Oldest first</SelectItem>
                <SelectItem value="source">By source</SelectItem>
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-[150px] items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs dark:bg-input/30">
              <Loader2 className="size-3.5 animate-spin" />
              Loading...
            </div>
          )}
        </div>
      </div>

      {/* Category filters + delete button */}
      <div className="flex items-center justify-between gap-3">
        {/* Mobile: category select */}
        <div className="sm:hidden">
          {mounted ? (
            <Select
              onValueChange={(v) => onCategoryChange(v === "all" ? "" : v)}
              value={category || "all"}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((cat) => (
                  <SelectItem
                    key={cat.value || "all"}
                    value={cat.value || "all"}
                  >
                    {cat.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="flex h-9 w-[140px] items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs dark:bg-input/30">
              <Loader2 className="size-3.5 animate-spin" />
              Loading...
            </div>
          )}
        </div>
        {/* Desktop: category pills */}
        <div className="hidden flex-wrap gap-1.5 sm:flex">
          {CATEGORIES.map((cat) => (
            <button
              className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
                category === cat.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
              }`}
              key={cat.value}
              onClick={() => onCategoryChange(cat.value)}
              type="button"
            >
              {cat.label}
            </button>
          ))}
        </div>
        {deleteButton}
      </div>
    </div>
  );
}
