"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ page, pageSize, total, onPageChange }: PaginationProps) {
  const start = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, total);
  const canGoPrev = page > 1;
  const canGoNext = end < total;

  const buttonClass = (enabled: boolean) =>
    `flex h-6 w-6 items-center justify-center rounded border border-outline-variant/14 bg-surface text-on-surface transition-colors ${
      enabled ? "hover:border-primary" : "cursor-not-allowed opacity-50"
    }`;

  return (
    <div className="flex h-row-height flex-shrink-0 items-center justify-between border-t border-outline-variant bg-surface-container-lowest px-4">
      <span className="font-caption-mono text-caption-mono text-on-surface-variant">
        {start}–{end} / {total.toLocaleString("tr-TR")}
      </span>
      <div className="flex gap-1">
        <button
          type="button"
          disabled={!canGoPrev}
          onClick={() => onPageChange(page - 1)}
          className={buttonClass(canGoPrev)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          disabled={!canGoNext}
          onClick={() => onPageChange(page + 1)}
          className={buttonClass(canGoNext)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
