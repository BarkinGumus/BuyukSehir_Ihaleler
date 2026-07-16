"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenderFilters } from "@/hooks/useTenderFilters";
import { getTenderFilterOptions } from "@/lib/api";
import { sourceLabel, TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";

const selectClass =
  "h-input-height min-w-[140px] rounded border border-outline-variant/14 bg-surface text-body-default text-on-surface focus:border-primary focus:ring-0";

const dateFieldClass =
  "h-input-height rounded border border-outline-variant/14 bg-surface px-2 text-body-default text-on-surface focus:border-primary focus:ring-0";

export function FilterBar() {
  const { filters, setFilter } = useTenderFilters();
  const { data: options } = useQuery({
    queryKey: ["tender-filter-options"],
    queryFn: getTenderFilterOptions,
  });

  return (
    <div className="flex w-full flex-wrap items-end gap-3">
      <select
        className={selectClass}
        value={filters.city}
        onChange={(e) => setFilter("city", e.target.value)}
      >
        <option value="">Şehir</option>
        {options?.cities.map((city) => (
          <option key={city} value={city}>
            {city}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.source}
        onChange={(e) => setFilter("source", e.target.value)}
      >
        <option value="">Kaynak</option>
        {options?.sources.map((source) => (
          <option key={source} value={source}>
            {sourceLabel(source)}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.type}
        onChange={(e) => setFilter("type", e.target.value)}
      >
        <option value="">Tür</option>
        {(Object.entries(TENDER_TYPE_LABELS) as [TenderType, string][]).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select
        className={selectClass}
        value={filters.procedure}
        onChange={(e) => setFilter("procedure", e.target.value)}
      >
        <option value="">Usul</option>
        {options?.procedures.map((procedure) => (
          <option key={procedure} value={procedure}>
            {procedure}
          </option>
        ))}
      </select>

      <label className="flex flex-col gap-1">
        <span className="font-label-compact text-label-compact text-on-surface-variant">
          Başlangıç Tarihi
        </span>
        <input
          type="date"
          className={dateFieldClass}
          value={filters.dateFrom}
          max={filters.dateTo || undefined}
          onChange={(e) => setFilter("dateFrom", e.target.value)}
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="font-label-compact text-label-compact text-on-surface-variant">
          Bitiş Tarihi
        </span>
        <input
          type="date"
          className={dateFieldClass}
          value={filters.dateTo}
          min={filters.dateFrom || undefined}
          onChange={(e) => setFilter("dateTo", e.target.value)}
        />
      </label>

      <select
        className={selectClass}
        value={filters.status}
        onChange={(e) => setFilter("status", e.target.value)}
      >
        <option value="">Durum</option>
        <option value="aktif">Aktif</option>
        <option value="gecmis">Geçmiş</option>
      </select>
    </div>
  );
}
