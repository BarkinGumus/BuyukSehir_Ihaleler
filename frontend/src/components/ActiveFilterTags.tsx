"use client";

import { X } from "lucide-react";
import { useTenderFilters, type TenderFilterState } from "@/hooks/useTenderFilters";
import { sourceLabel, TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";

const STATUS_LABELS: Record<string, string> = {
  aktif: "Aktif",
  gecmis: "Geçmiş",
};

interface Tag {
  key: keyof TenderFilterState;
  label: string;
}

function buildTags(filters: TenderFilterState): Tag[] {
  const tags: Tag[] = [];
  if (filters.city) tags.push({ key: "city", label: filters.city });
  if (filters.source) tags.push({ key: "source", label: sourceLabel(filters.source) });
  if (filters.type) tags.push({ key: "type", label: TENDER_TYPE_LABELS[filters.type as TenderType] });
  if (filters.procedure) tags.push({ key: "procedure", label: filters.procedure });
  if (filters.status) tags.push({ key: "status", label: STATUS_LABELS[filters.status] });
  if (filters.search) tags.push({ key: "search", label: `"${filters.search}"` });
  if (filters.institution) tags.push({ key: "institution", label: filters.institution });
  if (filters.unit) tags.push({ key: "unit", label: filters.unit });
  if (filters.dateFrom) tags.push({ key: "dateFrom", label: `Başlangıç: ${filters.dateFrom}` });
  if (filters.dateTo) tags.push({ key: "dateTo", label: `Bitiş: ${filters.dateTo}` });
  return tags;
}

export function ActiveFilterTags({ resultCount }: { resultCount: number }) {
  const { filters, clearFilter } = useTenderFilters();
  const tags = buildTags(filters);

  return (
    <div className="flex w-full items-center gap-3 border-t border-outline-variant/14 pt-3">
      <span className="font-caption-mono text-caption-mono text-on-surface-variant">
        {resultCount.toLocaleString("tr-TR")} sonuç
      </span>
      {tags.length > 0 && (
        <>
          <div className="mx-1 h-4 w-px bg-outline-variant/14" />
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <span
                key={tag.key}
                className="inline-flex items-center gap-1 rounded-sm border border-outline-variant/14 bg-surface-variant px-2 py-1 text-[12px] text-on-surface"
              >
                {tag.label}
                <button
                  type="button"
                  onClick={() => clearFilter(tag.key)}
                  className="transition-colors hover:text-primary"
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
