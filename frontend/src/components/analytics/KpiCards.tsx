"use client";

import { Loader2, TrendingDown, TrendingUp } from "lucide-react";
import type { KpiData } from "@/lib/api";

function KpiCard({
  label,
  value,
  valueClassName,
  icon,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col justify-center gap-1 rounded border border-outline-variant/14 bg-surface p-4">
      <span className="font-label-compact text-label-compact uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span
        className={`flex items-center gap-1 font-caption-mono text-headline-md ${valueClassName ?? "text-on-surface"}`}
      >
        {value}
        {icon}
      </span>
    </div>
  );
}

interface KpiCardsProps {
  data: KpiData | undefined;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading || !data) {
    return (
      <div className="flex h-24 w-full items-center justify-center rounded border border-outline-variant/14 bg-surface">
        <Loader2 size={20} className="animate-spin text-on-surface-variant" />
      </div>
    );
  }

  const pct = data.monthOverMonthPct;
  const pctLabel = pct === null ? "—" : `${pct > 0 ? "+" : ""}${pct.toLocaleString("tr-TR")}%`;
  const pctClassName =
    pct === null ? "text-on-surface-variant" : pct >= 0 ? "text-[#34D399]" : "text-red-400";

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7">
      <KpiCard label="Toplam İhale" value={data.total.toLocaleString("tr-TR")} />
      <KpiCard
        label="Bugün Eklenen"
        value={data.todayAdded.toLocaleString("tr-TR")}
        valueClassName="text-primary"
      />
      <KpiCard
        label="Aktif İhale"
        value={data.active.toLocaleString("tr-TR")}
        valueClassName="text-tertiary"
      />
      <KpiCard
        label="Bugün Sona Erecek"
        value={data.endingToday.toLocaleString("tr-TR")}
        valueClassName="text-secondary"
      />
      <KpiCard label="Takip Edilen Kurum" value={data.institutionCount.toLocaleString("tr-TR")} />
      <KpiCard label="Bu Ay Toplam" value={data.thisMonthTotal.toLocaleString("tr-TR")} />
      <KpiCard
        label="Geçen Aya Göre"
        value={pctLabel}
        valueClassName={pctClassName}
        icon={
          pct !== null &&
          (pct >= 0 ? <TrendingUp size={16} /> : <TrendingDown size={16} />)
        }
      />
    </div>
  );
}
