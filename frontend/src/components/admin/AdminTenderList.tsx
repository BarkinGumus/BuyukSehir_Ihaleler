"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { deleteTender, getTenders, updateTender, type TenderUpdatePayload } from "@/lib/api";
import { sourceLabel, type Tender } from "@/lib/types";
import { useTenderFilters } from "@/hooks/useTenderFilters";
import { ActiveFilterTags } from "@/components/ActiveFilterTags";
import { FilterBar } from "@/components/FilterBar";
import { Pagination } from "@/components/Pagination";
import { SearchBar } from "@/components/SearchBar";
import { TenderEditModal } from "./TenderEditModal";

const PAGE_SIZE = 20;

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR");
}

export function AdminTenderList() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();
  const { filters } = useTenderFilters();
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState<Tender | null>(null);

  // Filtreler değişince sayfa 1'e dönsün - page.tsx'teki ile aynı desen.
  const [prevFilters, setPrevFilters] = useState(filters);
  if (filters !== prevFilters) {
    setPrevFilters(filters);
    setPage(1);
  }

  const { data } = useQuery({
    queryKey: ["admin-tenders", filters, page],
    queryFn: () =>
      getTenders({
        city: filters.city || undefined,
        source: filters.source || undefined,
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

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["admin-tenders"] });
    queryClient.invalidateQueries({ queryKey: ["tenders"] });
  };

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TenderUpdatePayload }) => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return updateTender(id, data, token);
    },
    onSuccess: () => {
      invalidateAll();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return deleteTender(id, token);
    },
    onSuccess: invalidateAll,
  });

  return (
    <div className="flex flex-col gap-4">
      <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
        İhale Yönetimi
      </h3>
      <div className="flex w-full flex-col gap-element-gap">
        <SearchBar />
        <FilterBar />
        <ActiveFilterTags resultCount={data?.total ?? 0} />
      </div>
      <div className="flex flex-col overflow-hidden rounded border border-outline-variant/14 bg-surface">
        <div className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-outline-variant bg-surface-container-lowest px-4 py-2 font-label-compact text-[12px] uppercase text-on-surface-variant">
          <span>İhale Konusu</span>
          <span>Şehir</span>
          <span>Kaynak</span>
          <span>Tarih</span>
          <span>İşlem</span>
        </div>
        {data?.items.map((tender) => (
          <div
            key={tender.id}
            className="grid grid-cols-[3fr_1fr_1fr_1fr_auto] items-center gap-4 border-b border-outline-variant/60 px-4 py-3 last:border-b-0"
          >
            <span className="truncate text-body-default text-on-surface" title={tender.title}>
              {tender.title}
            </span>
            <span className="text-body-default text-on-surface-variant">{tender.province ?? "—"}</span>
            <span className="text-body-default text-on-surface-variant">{sourceLabel(tender.source)}</span>
            <span className="font-data-mono text-data-mono text-secondary">
              {formatDate(tender.tender_datetime)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Düzenle"
                onClick={() => setEditing(tender)}
                className="rounded p-1.5 text-on-surface-variant hover:bg-surface-variant hover:text-primary"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                aria-label="Sil"
                onClick={() => {
                  if (confirm(`"${tender.title}" silinsin mi?`)) {
                    deleteMutation.mutate(tender.id);
                  }
                }}
                className="rounded p-1.5 text-on-surface-variant hover:bg-red-500/10 hover:text-red-400"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        {data?.items.length === 0 && (
          <div className="flex items-center justify-center py-12 text-body-default text-on-surface-variant">
            Sonuç bulunamadı
          </div>
        )}
        <Pagination page={page} pageSize={PAGE_SIZE} total={data?.total ?? 0} onPageChange={setPage} />
      </div>

      {editing && (
        <TenderEditModal
          tender={editing}
          onCancel={() => setEditing(null)}
          onSave={(formData) => updateMutation.mutate({ id: editing.id, data: formData })}
          saving={updateMutation.isPending}
        />
      )}
    </div>
  );
}
