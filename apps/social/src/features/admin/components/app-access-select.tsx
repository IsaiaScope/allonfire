"use client";

import { Checkbox } from "@allonfire/ui/components/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@allonfire/ui/components/popover";
import { ChevronDown } from "lucide-react";
import { ALL_APPS } from "../constants/apps";

type AppAccessSelectProps = {
  value: string[];
  onToggle: (appId: string, checked: boolean) => void;
  disabled?: boolean;
  idPrefix?: string;
};

export function AppAccessSelect({
  value,
  onToggle,
  disabled,
  idPrefix = "app",
}: AppAccessSelectProps) {
  const label =
    value.length === 0
      ? "Select apps"
      : ALL_APPS.filter((a) => value.includes(a.id))
          .map((a) => a.label)
          .join(", ");

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className="flex h-9 w-full items-center justify-between rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs focus:outline-none focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 dark:bg-input/30"
          disabled={disabled}
          type="button"
        >
          <span className="truncate text-left">{label}</span>
          <ChevronDown className="size-3.5 shrink-0 opacity-50" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-48 p-2">
        <div className="space-y-1.5">
          {ALL_APPS.map((app) => (
            <label
              className="flex cursor-pointer items-center gap-2.5 rounded-sm px-2 py-1.5 text-sm hover:bg-muted"
              htmlFor={`${idPrefix}-${app.id}`}
              key={app.id}
            >
              <Checkbox
                checked={value.includes(app.id)}
                id={`${idPrefix}-${app.id}`}
                onCheckedChange={(checked) =>
                  onToggle(app.id, checked === true)
                }
              />
              {app.label}
            </label>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
