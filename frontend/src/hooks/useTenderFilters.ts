"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useMemo } from "react";
import type { TenderStatusFilter } from "@/lib/api";
import type { TenderType } from "@/lib/types";

export interface TenderFilterState {
  city: string;
  type: TenderType | "";
  procedure: string;
  status: TenderStatusFilter | "";
  search: string;
  dateFrom: string;
  dateTo: string;
}

const EMPTY_FILTERS: TenderFilterState = {
  city: "",
  type: "",
  procedure: "",
  status: "",
  search: "",
  dateFrom: "",
  dateTo: "",
};

// URL query param anahtarları component alan adlarından farklı (kısa/İngilizce
// tutuyoruz ki paylaşılan linkler kısa olsun).
const PARAM_KEYS: Record<keyof TenderFilterState, string> = {
  city: "city",
  type: "type",
  procedure: "usul",
  status: "durum",
  search: "q",
  dateFrom: "date_from",
  dateTo: "date_to",
};

// Filtre state'i URL query params'ta tutulur - bu sayede bir filtre
// kombinasyonu link olarak paylaşılabilir, sayfa yenilenince kaybolmaz.
export function useTenderFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const filters: TenderFilterState = useMemo(
    () => ({
      city: searchParams.get(PARAM_KEYS.city) ?? "",
      type: (searchParams.get(PARAM_KEYS.type) as TenderType | null) ?? "",
      procedure: searchParams.get(PARAM_KEYS.procedure) ?? "",
      status: (searchParams.get(PARAM_KEYS.status) as TenderStatusFilter | null) ?? "",
      search: searchParams.get(PARAM_KEYS.search) ?? "",
      dateFrom: searchParams.get(PARAM_KEYS.dateFrom) ?? "",
      dateTo: searchParams.get(PARAM_KEYS.dateTo) ?? "",
    }),
    [searchParams],
  );

  const setFilter = useCallback(
    (key: keyof TenderFilterState, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(PARAM_KEYS[key], value);
      } else {
        params.delete(PARAM_KEYS[key]);
      }
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams],
  );

  const clearFilter = useCallback((key: keyof TenderFilterState) => setFilter(key, ""), [setFilter]);

  const clearAll = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [router, pathname]);

  const hasActiveFilters = useMemo(
    () => Object.values(filters).some((value) => value !== ""),
    [filters],
  );

  return { filters, setFilter, clearFilter, clearAll, hasActiveFilters };
}

export { EMPTY_FILTERS };
