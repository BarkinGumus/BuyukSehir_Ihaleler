"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ActiveFilterTags } from "@/components/ActiveFilterTags";
import { FilterBar } from "@/components/FilterBar";
import { SearchBar } from "@/components/SearchBar";
import { Sidebar } from "@/components/Sidebar";
import { StatsRow } from "@/components/StatsRow";
import { TenderDetailDrawer } from "@/components/TenderDetailDrawer";
import { TenderTable } from "@/components/TenderTable";
import { TopBar } from "@/components/TopBar";
import { useSelectedTender } from "@/hooks/useSelectedTender";
import { useTenderFilters } from "@/hooks/useTenderFilters";
import { getTenders, getTenderStats } from "@/lib/api";

const PAGE_SIZE = 50;

export default function Home() {
  const { filters } = useTenderFilters();
  const { selectTender } = useSelectedTender();
  const [page, setPage] = useState(1);

  // Filtreler değişince sayfa 1'e dönsün (eski sayfa numarasıyla boş sonuç
  // görünmesin diye) - React'ın önerdiği "render sırasında state ayarlama"
  // deseni, efekt yerine: https://react.dev/learn/you-might-not-need-an-effect
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(1);
  }

  const { data: stats } = useQuery({
    queryKey: ["tender-stats"],
    queryFn: getTenderStats,
  });

  const { data: tendersData, dataUpdatedAt } = useQuery({
    queryKey: ["tenders", filters, page],
    queryFn: () =>
      getTenders({
        city: filters.city || undefined,
        type: filters.type || undefined,
        procedure: filters.procedure || undefined,
        status: filters.status || undefined,
        search: filters.search || undefined,
        dateFrom: filters.dateFrom || undefined,
        dateTo: filters.dateTo || undefined,
        page,
        pageSize: PAGE_SIZE,
      }),
  });

  const lastUpdated = dataUpdatedAt
    ? new Date(dataUpdatedAt).toLocaleTimeString("tr-TR", { hour: "2-digit", minute: "2-digit" })
    : "—";

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex h-full w-full flex-col md:ml-sidebar-width">
        <TopBar lastUpdated={lastUpdated} />
        <div className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-container-padding">
          {stats && <StatsRow stats={stats} />}

          <div className="flex w-full flex-col gap-element-gap">
            <SearchBar />
            <FilterBar />
            <ActiveFilterTags resultCount={tendersData?.total ?? 0} />
          </div>

          <TenderTable
            tenders={tendersData?.items ?? []}
            page={tendersData?.page ?? page}
            pageSize={tendersData?.page_size ?? PAGE_SIZE}
            total={tendersData?.total ?? 0}
            onPageChange={setPage}
            onRowClick={selectTender}
          />
        </div>
      </main>
      <TenderDetailDrawer />
    </div>
  );
}
