"use client";

import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
} from "@tanstack/react-table";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { Pagination } from "./Pagination";
import { TableRow } from "./TableRow";
import { sourceLabel, TENDER_TYPE_LABELS, type Tender } from "@/lib/types";

const GRID_COLS = "grid-cols-[3fr_1fr_1fr_1.5fr_1fr_1fr_1.5fr_1fr]";

const columnHelper = createColumnHelper<Tender>();

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("tr-TR");
}

function isUpcoming(iso: string | null): boolean {
  return iso ? new Date(iso) >= new Date() : false;
}

// Kırpma (truncate + ellipsis) TableRow'daki hücre sarmalayıcısında (block
// seviyeli div) uygulanıyor - burada sadece metin rengi/font stiline bakıyoruz.
const columns = [
  columnHelper.accessor("title", {
    header: "İhale Konusu",
    cell: (info) => (
      <span className="text-body-default text-on-surface group-hover:text-primary">
        {info.getValue()}
      </span>
    ),
  }),
  columnHelper.accessor("province", {
    header: "Şehir",
    cell: (info) => <span className="text-body-default text-on-surface">{info.getValue() ?? "—"}</span>,
  }),
  columnHelper.accessor("source", {
    header: "Kaynak",
    cell: (info) => (
      <span className="text-body-default text-on-surface-variant">{sourceLabel(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("ikn", {
    header: "İKN",
    cell: (info) => (
      <span className="font-data-mono text-data-mono text-secondary">{info.getValue() ?? "—"}</span>
    ),
  }),
  columnHelper.accessor("tender_type", {
    header: "Tür",
    cell: (info) => (
      <span className="text-body-default text-on-surface">{TENDER_TYPE_LABELS[info.getValue()]}</span>
    ),
  }),
  columnHelper.accessor("tender_datetime", {
    header: "Tarih",
    cell: (info) => (
      <span className="font-data-mono text-data-mono text-secondary">{formatDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor("unit", {
    header: "Birim",
    cell: (info) => (
      <span className="text-body-default text-on-surface-variant">{info.getValue() ?? "—"}</span>
    ),
  }),
  // Durum, ham bir alan değil tender_datetime'dan hesaplanıyor - sıralamanın
  // da çalışması için accessorFn ile hesaplanan booleanı sıralama değeri
  // yapıyoruz, gösterimi yine cell'de özelleştiriyoruz.
  columnHelper.accessor((row) => isUpcoming(row.tender_datetime), {
    id: "status",
    header: "Durum",
    cell: (info) => {
      const active = info.getValue();
      return (
        <div className="flex items-center gap-2">
          <span className={`h-1.5 w-1.5 flex-shrink-0 rounded-full ${active ? "bg-[#34D399]" : "bg-[#8B95A7]"}`} />
          <span className="text-body-default text-on-surface">{active ? "Aktif" : "Geçmiş"}</span>
        </div>
      );
    },
  }),
];

interface TenderTableProps {
  tenders: Tender[];
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
  onRowClick: (id: number) => void;
}

export function TenderTable({
  tenders,
  page,
  pageSize,
  total,
  onPageChange,
  onRowClick,
}: TenderTableProps) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const table = useReactTable({
    data: tenders,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  return (
    <div className="flex min-h-[400px] flex-1 flex-col overflow-hidden rounded border border-outline-variant/14 bg-surface">
      <div
        className={`grid ${GRID_COLS} h-row-height items-center border-b border-outline-variant bg-surface-container-lowest px-4`}
      >
        {table.getFlatHeaders().map((header) => (
          <button
            key={header.id}
            type="button"
            onClick={header.column.getToggleSortingHandler()}
            className="flex min-w-0 items-center gap-1 truncate pr-4 text-left font-label-compact text-[12px] uppercase text-on-surface-variant"
          >
            {flexRender(header.column.columnDef.header, header.getContext())}
            {header.column.getIsSorted() === "asc" && <ChevronUp size={12} />}
            {header.column.getIsSorted() === "desc" && <ChevronDown size={12} />}
          </button>
        ))}
      </div>

      <div className="hide-scrollbar flex w-full flex-1 flex-col overflow-y-auto">
        {table.getRowModel().rows.map((row) => (
          <TableRow key={row.id} row={row} gridColsClassName={GRID_COLS} onClick={onRowClick} />
        ))}
        {table.getRowModel().rows.length === 0 && (
          <div className="flex flex-1 items-center justify-center py-12 text-body-default text-on-surface-variant">
            Sonuç bulunamadı
          </div>
        )}
      </div>

      <Pagination page={page} pageSize={pageSize} total={total} onPageChange={onPageChange} />
    </div>
  );
}
