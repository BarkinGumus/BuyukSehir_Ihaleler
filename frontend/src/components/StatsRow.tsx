import type { TenderStats } from "@/lib/api";

interface StatCellProps {
  label: string;
  value: number;
  valueClassName?: string;
  showBorder?: boolean;
}

function StatCell({ label, value, valueClassName, showBorder = true }: StatCellProps) {
  return (
    <div
      className={`flex flex-1 flex-col justify-center p-4 ${
        showBorder ? "border-r border-outline-variant/14" : ""
      }`}
    >
      <span className="mb-1 font-label-compact text-label-compact uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className={`font-caption-mono text-headline-md ${valueClassName ?? "text-on-surface"}`}>
        {value.toLocaleString("tr-TR")}
      </span>
    </div>
  );
}

export function StatsRow({ stats }: { stats: TenderStats }) {
  return (
    <div className="flex w-full rounded border border-outline-variant/14 bg-surface">
      <StatCell label="Toplam İhale" value={stats.total} />
      <StatCell label="Yeni" value={stats.newCount} valueClassName="text-primary" />
      <StatCell label="Yaklaşan" value={stats.upcomingCount} valueClassName="text-tertiary" />
      <StatCell
        label="Kaynak"
        value={stats.sourceCount}
        valueClassName="text-secondary"
        showBorder={false}
      />
    </div>
  );
}
