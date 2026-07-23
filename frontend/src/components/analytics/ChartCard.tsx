"use client";

import { Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface ChartCardProps {
  title: string;
  isLoading: boolean;
  isError: boolean;
  isEmpty: boolean;
  children: ReactNode;
  className?: string;
  footer?: ReactNode;
}

// Analiz panelindeki her grafik kartı bu sarmalayıcıyı kullanıyor - loading/
// error/empty state mantığını tek yerde tutup 10 farklı yerde tekrar etmemek için.
export function ChartCard({
  title,
  isLoading,
  isError,
  isEmpty,
  children,
  className,
  footer,
}: ChartCardProps) {
  return (
    <div
      className={`flex flex-col gap-3 rounded border border-outline-variant/14 bg-surface p-4 ${className ?? ""}`}
    >
      <span className="font-body-strong text-body-strong text-on-surface">{title}</span>
      {isLoading ? (
        <div className="flex h-52 items-center justify-center text-on-surface-variant">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : isError ? (
        <div className="flex h-52 items-center justify-center text-center text-body-default text-red-400">
          Veri yüklenirken hata oluştu
        </div>
      ) : isEmpty ? (
        <div className="flex h-52 items-center justify-center text-body-default text-on-surface-variant">
          Veri yok
        </div>
      ) : (
        children
      )}
      {!isLoading && !isError && !isEmpty && footer}
    </div>
  );
}
