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
import { useDebouncedSearch } from "@/features/topics/hooks/use-debounced-search";

export const RATINGS = [
  { value: "", label: "All" },
  { value: "POSITIVE", label: "Positive" },
  { value: "NEGATIVE", label: "Negative" },
  { value: "HAS_NOTES", label: "Has Notes" },
] as const;

type GenerateFiltersProps = {
  deleteButton?: ReactNode;
  onRatingChange: (rating: string) => void;
  onSearchChange: (search: string) => void;
  rating: string;
  search: string;
};

export function GenerateFilters({
  deleteButton,
  onRatingChange,
  onSearchChange,
  rating,
  search,
}: GenerateFiltersProps) {
  const { localSearch, setLocalSearch } = useDebouncedSearch({
    search,
    onSearchChange,
  });
  const mounted = useMounted();

  return (
    <div className="flex flex-col gap-3 rounded-lg border bg-card p-4">
      {/* Search row */}
      <div className="relative">
        <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          onChange={(e) => setLocalSearch(e.target.value)}
          placeholder="Search topics..."
          value={localSearch}
        />
      </div>

      {/* Filters + delete row */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {/* Mobile: rating select */}
          <div className="sm:hidden">
            {mounted ? (
              <Select
                onValueChange={(v) => onRatingChange(v === "all" ? "" : v)}
                value={rating || "all"}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  {RATINGS.map((r) => (
                    <SelectItem key={r.value || "all"} value={r.value || "all"}>
                      {r.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <div className="flex h-9 w-[130px] items-center gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-muted-foreground text-sm shadow-xs dark:bg-input/30">
                <Loader2 className="size-3.5 animate-spin" />
                Loading...
              </div>
            )}
          </div>

          {/* Desktop: rating pills */}
          <div className="hidden flex-wrap gap-1.5 sm:flex">
            {RATINGS.map((r) => (
              <button
                className={`rounded-full border px-3 py-1 font-medium text-xs transition-colors ${
                  rating === r.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border text-muted-foreground hover:border-muted-foreground hover:text-foreground"
                }`}
                key={r.value || "all"}
                onClick={() => onRatingChange(r.value)}
                type="button"
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        {deleteButton}
      </div>
    </div>
  );
}
