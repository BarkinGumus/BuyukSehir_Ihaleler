"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { Suspense } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TenderDetailDrawer } from "@/components/TenderDetailDrawer";
import { TenderTable } from "@/components/TenderTable";
import { TopBar } from "@/components/TopBar";
import { useSelectedTender } from "@/hooks/useSelectedTender";
import { getFavorites } from "@/lib/api";

export default function FavoritesPage() {
  return (
    <Suspense fallback={null}>
      <FavoritesContent />
    </Suspense>
  );
}

function FavoritesContent() {
  const { isSignedIn, isLoaded } = useUser();
  const { getToken } = useAuth();
  const { selectTender } = useSelectedTender();

  const { data: favorites, isLoading } = useQuery({
    queryKey: ["favorites"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return getFavorites(token);
    },
    enabled: !!isSignedIn,
  });

  return (
    <div className="flex h-screen w-full bg-surface">
      <Sidebar />
      <main className="flex h-full w-full flex-col md:ml-sidebar-width">
        <TopBar title="Favoriler" />
        <div className="hide-scrollbar flex flex-1 flex-col gap-6 overflow-y-auto overflow-x-hidden p-container-padding">
          {!isLoaded || isLoading ? (
            <span className="text-body-default text-on-surface-variant">Yükleniyor...</span>
          ) : !isSignedIn ? (
            <span className="text-body-default text-on-surface-variant">
              Favorileri görmek için giriş yapmalısın.
            </span>
          ) : (
            <TenderTable
              tenders={favorites ?? []}
              page={1}
              pageSize={Math.max(favorites?.length ?? 1, 1)}
              total={favorites?.length ?? 0}
              onPageChange={() => {}}
              onRowClick={selectTender}
            />
          )}
        </div>
      </main>
      <TenderDetailDrawer />
    </div>
  );
}
