"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getInstitutions, type AnalyticsFilters } from "@/lib/api";
import { ChartCard } from "./ChartCard";
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";
import { TruncatedTick } from "./TruncatedTick";

function pivotByMonth(
  rows: { institution: string; month: string; count: number }[],
): Record<string, string | number>[] {
  const byMonth = new Map<string, Record<string, string | number>>();
  for (const row of rows) {
    if (!byMonth.has(row.month)) byMonth.set(row.month, { month: row.month });
    byMonth.get(row.month)![row.institution] = row.count;
  }
  return Array.from(byMonth.values()).sort((a, b) =>
    String(a.month).localeCompare(String(b.month)),
  );
}

export function InstitutionsSection({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-institutions", filters],
    queryFn: () => getInstitutions(filters),
  });

  const topInstitutions = data?.topInstitutions.slice(0, 10) ?? [];
  const top5Names = data?.topInstitutions.slice(0, 5).map((i) => i.label) ?? [];
  const monthlyData = data ? pivotByMonth(data.institutionMonthly) : [];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        Kurum Analizi
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="En Çok İhale Veren Kurumlar"
          isLoading={isLoading}
          isError={isError}
          isEmpty={topInstitutions.length === 0}
        >
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={topInstitutions} layout="vertical" margin={{ left: 8 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis type="number" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke={AXIS_COLOR}
                tick={<TruncatedTick maxLength={24} />}
                width={170}
                interval={0}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="İhale sayısı" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="En Çok İhale Veren Kurum / Birim"
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data || data.topInstitutionUnits.length === 0}
        >
          <div className="flex max-h-[280px] flex-col gap-2 overflow-y-auto">
            {data?.topInstitutionUnits.map((row, i) => (
              <div
                key={`${row.institution}-${row.unit}-${i}`}
                className="flex items-center justify-between gap-3 border-b border-outline-variant/14 py-1.5 last:border-b-0"
              >
                <div className="flex min-w-0 flex-col">
                  <span className="truncate text-body-default text-on-surface" title={row.institution}>
                    {row.institution}
                  </span>
                  <span
                    className="truncate font-caption-mono text-caption-mono text-on-surface-variant"
                    title={row.unit ?? undefined}
                  >
                    {row.unit ?? "—"}
                  </span>
                </div>
                <span className="flex-shrink-0 font-data-mono text-data-mono text-secondary">
                  {row.count} ihale
                </span>
              </div>
            ))}
          </div>
        </ChartCard>
      </div>

      <ChartCard
        title="En Çok İhale Veren 5 Kurumun Aylık Değişimi"
        isLoading={isLoading}
        isError={isError}
        isEmpty={monthlyData.length === 0}
      >
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={monthlyData}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis dataKey="month" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
            <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Legend wrapperStyle={{ fontSize: 10 }} />
            {top5Names.map((name, i) => (
              <Bar
                key={name}
                dataKey={name}
                name={name}
                fill={CHART_COLORS[i % CHART_COLORS.length]}
                radius={[2, 2, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
