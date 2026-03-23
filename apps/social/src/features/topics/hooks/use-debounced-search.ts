import { useEffect, useState } from "react";

type UseDebouncedSearchOptions = {
  search: string;
  onSearchChange: (search: string) => void;
  delay?: number;
};

export function useDebouncedSearch({
  search,
  onSearchChange,
  delay = 300,
}: UseDebouncedSearchOptions) {
  const [localSearch, setLocalSearch] = useState(search);

  // Sync local state when parent resets search externally
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (localSearch !== search) {
        onSearchChange(localSearch);
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [localSearch, search, onSearchChange, delay]);

  return { localSearch, setLocalSearch };
}
