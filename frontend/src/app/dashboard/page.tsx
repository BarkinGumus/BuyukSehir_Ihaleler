"use client";

import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { ActiveFilterTags } from "@/components/ActiveFilterTags";
import { ContentSection } from "@/components/analytics/ContentSection";
import { GeographySection } from "@/components/analytics/GeographySection";
import { InstitutionsSection } from "@/components/analytics/InstitutionsSection";
import { KpiCards } from "@/components/analytics/KpiCards";
import { TrendsSection } from "@/components/analytics/TrendsSection";
import { FilterBar } from "@/components/FilterBar";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { useTenderFilters } from "@/hooks/useTenderFilters";
import { getKpis, type AnalyticsFilters } from "@/lib/api";

export default function DashboardPage() {
  return (
    <Suspense fallback={null}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const { filters: rawFilters } = useTenderFilters();

  const filters: AnalyticsFilters = {
    city: rawFilters.city || undefined,
    source: rawFilters.source || undefined,
    type: rawFilters.type || undefined,
    procedure: rawFilters.procedure || undefined,
    institution: rawFilters.institution || undefined,
    unit: rawFilters.unit || undefined,
    dateFrom: rawFilters.dateFrom || undefined,
    dateTo: rawFilters.dateTo || undefined,
  };

  const { data: kpis, isLoading: kpisLoading } = useQuery({
    queryKey: ["analytics-kpis", filters],
    queryFn: () => getKpis(filters),
  });

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex h-full w-full flex-col md:ml-sidebar-width">
        <TopBar title="Dashboard" />
        <div className="hide-scrollbar flex flex-1 flex-col gap-8 overflow-y-auto overflow-x-hidden p-container-padding">
          <div className="flex w-full flex-col gap-element-gap">
            <FilterBar showInstitutionUnit />
            <ActiveFilterTags resultCount={kpis?.total ?? 0} />
          </div>

          <KpiCards data={kpis} isLoading={kpisLoading} />

          <TrendsSection filters={filters} />
          <GeographySection filters={filters} />
          <InstitutionsSection filters={filters} />
          <ContentSection filters={filters} />
        </div>
      </main>
    </div>
  );
}
