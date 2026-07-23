"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AnalyticsFilters, TrendGranularity } from "@/lib/api";
import { getTrends } from "@/lib/api";
import { ChartCard } from "./ChartCard";
import { AXIS_COLOR, CHART_COLORS, GRID_COLOR, TOOLTIP_STYLE } from "./chartTheme";

const GRANULARITY_LABELS: Record<TrendGranularity, string> = {
  day: "Günlük",
  week: "Haftalık",
  month: "Aylık",
  year: "Yıllık",
};

export function TrendsSection({ filters }: { filters: AnalyticsFilters }) {
  const [granularity, setGranularity] = useState<TrendGranularity>("day");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["analytics-trends", granularity, filters],
    queryFn: () => getTrends(granularity, filters),
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        Trend Analizleri
      </h3>

      <ChartCard
        title="İhale Sayısı"
        isLoading={isLoading}
        isError={isError}
        isEmpty={!data || data.series.length === 0}
        footer={
          data?.avgPublishLeadDays != null && (
            <span className="font-caption-mono text-caption-mono text-on-surface-variant">
              Ortalama yayın süresi (tespit → ihale tarihi): {data.avgPublishLeadDays} gün
            </span>
          )
        }
      >
        <div className="flex items-center gap-2">
          {(Object.entries(GRANULARITY_LABELS) as [TrendGranularity, string][]).map(
            ([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setGranularity(value)}
                className={`h-7 rounded-sm px-3 font-label-compact text-label-compact transition-colors ${
                  granularity === value
                    ? "bg-primary text-on-primary"
                    : "bg-surface-variant text-on-surface-variant hover:text-on-surface"
                }`}
              >
                {label}
              </button>
            ),
          )}
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={data?.series}>
            <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
            <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
            <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
            <Tooltip contentStyle={TOOLTIP_STYLE} />
            <Line
              type="monotone"
              dataKey="count"
              name="İhale sayısı"
              stroke={CHART_COLORS[0]}
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard
          title="Haftanın Gününe Göre Dağılım"
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data || data.byWeekday.length === 0}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.byWeekday}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="İhale sayısı" fill={CHART_COLORS[1]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard
          title="Aylara Göre Yoğunluk"
          isLoading={isLoading}
          isError={isError}
          isEmpty={!data || data.byMonthOfYear.length === 0}
        >
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data?.byMonthOfYear}>
              <CartesianGrid stroke={GRID_COLOR} strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke={AXIS_COLOR} tick={{ fontSize: 11 }} />
              <YAxis stroke={AXIS_COLOR} tick={{ fontSize: 11 }} allowDecimals={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="count" name="İhale sayısı" fill={CHART_COLORS[2]} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>
    </div>
  );
}
