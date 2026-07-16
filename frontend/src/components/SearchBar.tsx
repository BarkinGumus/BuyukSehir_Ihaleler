"use client";

import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useTenderFilters } from "@/hooks/useTenderFilters";

export function SearchBar() {
  const { filters, setFilter } = useTenderFilters();
  const [value, setValue] = useState(filters.search);

  // URL değişirse (örn. "Filtreleri temizle") input'u senkron tut - efekt
  // yerine "render sırasında ayarlama" deseni kullanılıyor
  const [prevSearch, setPrevSearch] = useState(filters.search);
  if (filters.search !== prevSearch) {
    setPrevSearch(filters.search);
    setValue(filters.search);
  }

  // Her tuş vuruşunda URL'i güncellemek yerine 300ms bekleyip tek seferde yaz
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== filters.search) setFilter("search", value);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <div className="relative w-full">
      <Search
        size={16}
        className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
      />
      <input
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="İhale ara..."
        className="h-input-height w-full rounded border border-outline-variant/14 bg-surface pl-9 pr-3 text-body-default text-on-surface transition-colors placeholder:text-on-surface-variant focus:border-primary focus:ring-0"
      />
    </div>
  );
}
