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
import { getGeography, type AnalyticsFilters } from "@/lib/api";
import { TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";

const TOP_PROVINCE_COUNT = 10;
const STACKED_PROVINCE_COUNT = 6;

function pivotByProvince(
  rows: { province: string; tender_type: TenderType; count: number }[],
  provinces: string[],
): Record<string, string | number>[] {
  const byProvince = new Map<string, Record<string, string | number>>();
  for (const province of provinces) {
    byProvince.set(province, { province });
  }
  for (const row of rows) {
    const entry = byProvince.get(row.province);
    if (entry) entry[row.tender_type] = row.count;
  }
  return provinces.map((p) => byProvince.get(p)!);
}

export function GeographySection({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-geography", filters],
    queryFn: () => getGeography(filters),
  });

  const topProvinces = data?.byProvince.slice(0, TOP_PROVINCE_COUNT) ?? [];
  const stackedProvinces = data?.byProvince.slice(0, STACKED_PROVINCE_COUNT).map((p) => p.label) ?? [];
  const stackedData = data
    ? pivotByProvince(data.byProvinceAndType, stackedProvinces)
    : [];
  const tenderTypesPresent = Array.from(
    new Set(data?.byProvinceAndType.map((r) => r.tender_type) ?? []),
  );

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        Coğrafi Analiz
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="En Çok İhale Açan Şehirler"
          isLoading={isLoading}
          isError={isError}
          isEmpty={topProvinces.length === 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={topProvinces} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis type="number" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke={AXIS_COLOR}
                tick={{ fontSize: 11 }}
                width={90}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="İhale sayısı" fill={CHART_COLORS[0]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Şehir Bazında İhale Türleri (ilk 6 şehir)"
          isLoading={isLoading}
          isError={isError}
          isEmpty={stackedData.length === 0}
        >
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={stackedData}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="province" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {tenderTypesPresent.map((type, i) => (
                <Bar
                  key={type}
                  dataKey={type}
                  name={TENDER_TYPE_LABELS[type]}
                  stackId="a"
                  fill={CHART_COLORS[i % CHART_COLORS.length]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
