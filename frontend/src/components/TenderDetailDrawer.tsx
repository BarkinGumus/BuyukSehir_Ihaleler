"use client";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import { useSelectedTender } from "@/hooks/useSelectedTender";
import { getTenderById } from "@/lib/api";
import { TENDER_TYPE_LABELS } from "@/lib/types";

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

function InfoRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-1 border-b border-outline-variant/14 py-3">
      <span className="font-label-compact text-label-compact uppercase tracking-wider text-on-surface-variant">
        {label}
      </span>
      <span className="text-body-default text-on-surface">{value}</span>
    </div>
  );
}

export function TenderDetailDrawer() {
  const { selectedId, closeTender } = useSelectedTender();
  const isOpen = selectedId !== null;
  const [showRawData, setShowRawData] = useState(false);

  const { data: tender, isLoading } = useQuery({
    queryKey: ["tender", selectedId],
    queryFn: () => getTenderById(selectedId as number),
    enabled: isOpen,
  });

  if (!isOpen) return null;

  const active = tender?.tender_datetime ? new Date(tender.tender_datetime) >= new Date() : false;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <button
        type="button"
        aria-label="Kapat"
        onClick={() => {
          closeTender();
          setShowRawData(false);
        }}
        className="absolute inset-0 bg-black/40"
      />
      <div className="hide-scrollbar relative flex h-full w-full max-w-xl flex-col overflow-y-auto border-l border-outline-variant/14 bg-surface">
        <div className="flex items-start justify-between gap-4 border-b border-outline-variant/14 p-container-padding">
          <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
            {isLoading ? "Yükleniyor…" : (tender?.title ?? "İhale bulunamadı")}
          </h3>
          <button
            type="button"
            onClick={() => {
              closeTender();
              setShowRawData(false);
            }}
            className="rounded p-1 text-on-surface-variant transition-colors hover:bg-surface-variant hover:text-primary"
          >
            <X size={20} />
          </button>
        </div>

        {tender && (
          <div className="flex flex-1 flex-col px-container-padding">
            <div className="flex items-center gap-2 py-3">
              <span className={`h-1.5 w-1.5 rounded-full ${active ? "bg-[#34D399]" : "bg-[#8B95A7]"}`} />
              <span className="text-body-default text-on-surface">{active ? "Aktif" : "Geçmiş"}</span>
            </div>

            <InfoRow label="Şehir / İl" value={tender.province} />
            <InfoRow label="Kurum" value={tender.institution} />
            <InfoRow label="Birim" value={tender.unit} />
            <InfoRow label="İKN" value={tender.ikn} />
            <InfoRow label="Tür" value={TENDER_TYPE_LABELS[tender.tender_type]} />
            <InfoRow label="Usul" value={tender.procedure} />
            <InfoRow label="İhale Tarihi" value={formatDateTime(tender.tender_datetime)} />
            <InfoRow label="İhalenin Yapılacağı Yer" value={tender.venue} />
            <InfoRow label="Adres" value={tender.address} />
            <InfoRow label="Telefon" value={tender.phone} />
            <InfoRow label="Teslim Yeri" value={tender.delivery_place} />
            <InfoRow label="Süre" value={tender.duration} />
            <InfoRow label="Açıklama" value={tender.description} />

            <div className="flex flex-col gap-1 border-b border-outline-variant/14 py-3">
              <span className="font-label-compact text-label-compact uppercase tracking-wider text-on-surface-variant">
                Kaynak
              </span>
              <a
                href={tender.detail_url}
                target="_blank"
                rel="noreferrer"
                className="truncate text-body-default text-primary hover:underline"
              >
                {tender.detail_url}
              </a>
            </div>

            <InfoRow label="İlk Görülme" value={formatDateTime(tender.first_seen_at)} />
            <InfoRow label="Son Görülme" value={formatDateTime(tender.last_seen_at)} />

            <div className="py-3">
              <button
                type="button"
                onClick={() => setShowRawData((prev) => !prev)}
                className="font-body-strong text-body-strong text-primary"
              >
                {showRawData ? "Ham veriyi gizle" : "Ham veriyi göster"}
              </button>
              {showRawData && (
                <pre className="mt-2 max-h-64 overflow-auto rounded bg-surface-container-lowest p-3 font-caption-mono text-caption-mono text-on-surface-variant">
                  {JSON.stringify(tender.raw_data, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
