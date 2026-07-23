"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { getContent, type AnalyticsFilters } from "@/lib/api";
import { TENDER_TYPE_LABELS, type TenderType } from "@/lib/types";
import { ChartCard } from "./ChartCard";
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";

export function ContentSection({ filters }: { filters: AnalyticsFilters }) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-content", filters],
    queryFn: () => getContent(filters),
  });

  const typeData =
    data?.byTenderType.map((r) => ({
      ...r,
      label: TENDER_TYPE_LABELS[r.label as TenderType] ?? r.label,
    })) ?? [];
  const keywordData = data?.topKeywords.slice(0, 20) ?? [];

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        İhale İçerik Analizi
      </h3>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="İhale Türü Dağılımı"
          isLoading={isLoading}
          isError={isError}
          isEmpty={typeData.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={typeData}
                dataKey="count"
                nameKey="label"
                cx="50%"
                cy="50%"
                outerRadius={90}
                label={(entry) => `${entry.name}`}
              >
                {typeData.map((_, i) => (
                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="İhale Usulü Dağılımı (ilk 10)"
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data || data.byProcedure.length === 0}
        >
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={data?.byProcedure} layout="vertical" margin={{ left: 16 }}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis type="number" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis
                type="category"
                dataKey="label"
                stroke={AXIS_COLOR}
                tick={{ fontSize: 9 }}
                width={160}
              />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="İhale sayısı" fill={CHART_COLORS[1]} radius={[0, 3, 3, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Başlıklarda En Çok Geçen Kelimeler"
        isLoading={isLoading}
        isError={isError}
        isEmpty={keywordData.length === 0}
      >
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={keywordData} layout="vertical" margin={{ left: 16 }}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis type="number" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
            <YAxis type="category" dataKey="word" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} width={90} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Bar dataKey="count" name="Geçme sayısı" fill={CHART_COLORS[3]} radius={[0, 3, 3, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
    </div>
  );
}
