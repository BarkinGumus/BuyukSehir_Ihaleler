"use client";

import { useQuery } from "@tanstack/react-query";
import { useTenderFilters } from "@/hooks/useTenderFilters";
import { getTenderFilterOptions } from "@/lib/api";
import { TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";

const selectClass =
  "h-input-height min-w-[140px] rounded border border-outline-variant/14 bg-surface text-body-default text-on-surface focus:border-primary focus:ring-0";

function toISODate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

// "Tarih" select'i tek bir alan ama dateFrom/dateTo çiftini set ediyor -
// bu yüzden seçili değeri, mevcut dateFrom/dateTo'nun hangi hazır aralığa
// karşılık geldiğine bakarak geri türetiyoruz.
function datePreset(dateFrom: string, dateTo: string): string {
  if (!dateFrom && !dateTo) return "";
  const today = new Date();
  const presets = buildDatePresets(today);
  const match = Object.entries(presets).find(
    ([, range]) => range.from === dateFrom && range.to === dateTo,
  );
  return match?.[0] ?? "";
}

function buildDatePresets(today: Date): Record<string, { from: string; to: string }> {
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6);

  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

  const next30 = new Date(today);
  next30.setDate(today.getDate() + 30);

  return {
    bugun: { from: toISODate(today), to: toISODate(today) },
    "bu-hafta": { from: toISODate(startOfWeek), to: toISODate(endOfWeek) },
    "bu-ay": { from: toISODate(startOfMonth), to: toISODate(endOfMonth) },
    "gelecek-30-gun": { from: toISODate(today), to: toISODate(next30) },
  };
}

export function FilterBar() {
  const { filters, setFilter } = useTenderFilters();
  const { data: options } = useQuery({
    queryKey: ["tender-filter-options"],
    queryFn: getTenderFilterOptions,
  });

  const presets = buildDatePresets(new Date());
  const selectedPreset = datePreset(filters.dateFrom, filters.dateTo);

  return (
    <div className="flex w-full flex-wrap gap-3">
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

      <select
        className={selectClass}
        value={selectedPreset}
        onChange={(e) => {
          const key = e.target.value;
          const range = key ? presets[key] : null;
          setFilter("dateFrom", range?.from ?? "");
          setFilter("dateTo", range?.to ?? "");
        }}
      >
        <option value="">Tarih</option>
        <option value="bugun">Bugün</option>
        <option value="bu-hafta">Bu Hafta</option>
        <option value="bu-ay">Bu Ay</option>
        <option value="gelecek-30-gun">Gelecek 30 Gün</option>
      </select>

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
