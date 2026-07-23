"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useTenderFilters, type TenderFilterState } from "@/hooks/useTenderFilters";
import { getTenderFilterOptions } from "@/lib/api";
import { sourceLabel, TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";

const selectClass =
  "h-input-height min-w-[140px] rounded border border-outline-variant/14 bg-surface text-body-default text-on-surface focus:border-primary focus:ring-0";

const dateFieldClass =
  "h-input-height rounded border border-outline-variant/14 bg-surface px-2 text-body-default text-on-surface focus:border-primary focus:ring-0";

interface DebouncedTextFilterProps {
  filterKey: keyof TenderFilterState;
  placeholder: string;
  listId: string;
  options: string[];
}

// Kurum/birim 1000+ farklı değer içerebiliyor - düz <select> kullanışsız
// olurdu, bu yüzden <datalist> destekli serbest metin alanı (arama-gibi
// yazdıkça filtreleyen) kullanılıyor. SearchBar'daki 300ms debounce deseninin
// aynısı - her tuş vuruşunda URL'i (ve dolayısıyla tüm grafikleri) güncellemek
// yerine yazma bitince tek seferde uyguluyor.
function DebouncedTextFilter({ filterKey, placeholder, listId, options }: DebouncedTextFilterProps) {
  const { filters, setFilter } = useTenderFilters();
  const [value, setValue] = useState(filters[filterKey]);

  const [prevValue, setPrevValue] = useState(filters[filterKey]);
  if (filters[filterKey] !== prevValue) {
    setPrevValue(filters[filterKey]);
    setValue(filters[filterKey]);
  }

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (value !== filters[filterKey]) setFilter(filterKey, value);
    }, 300);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <>
      <input
        type="text"
        list={listId}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={`${selectClass} px-3`}
      />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}

interface FilterBarProps {
  // Kurum/birim filtreleri sadece analiz panelinde (/dashboard) gösteriliyor -
  // ihale listesi/admin sayfası bu bileşeni değişmeden aynen kullanmaya devam ediyor.
  showInstitutionUnit?: boolean;
}

export function FilterBar({ showInstitutionUnit = false }: FilterBarProps) {
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

      {showInstitutionUnit && (
        <>
          <DebouncedTextFilter
            filterKey="institution"
            placeholder="Kurum ara..."
            listId="institution-options"
            options={options?.institutions ?? []}
          />
          <DebouncedTextFilter
            filterKey="unit"
            placeholder="Birim ara..."
            listId="unit-options"
            options={options?.units ?? []}
          />
        </>
      )}

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

      {!showInstitutionUnit && (
        <select
          className={selectClass}
          value={filters.status}
          onChange={(e) => setFilter("status", e.target.value)}
        >
          <option value="">Durum</option>
          <option value="aktif">Aktif</option>
          <option value="gecmis">Geçmiş</option>
        </select>
      )}
    </div>
  );
}
