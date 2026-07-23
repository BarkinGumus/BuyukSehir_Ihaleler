"use client";

import { useState } from "react";
import { TENDER_TYPE_LABELS, type Tender, type TenderType } from "@/lib/types";
import type { TenderUpdatePayload } from "@/lib/api";

const fieldClass =
  "h-input-height rounded border border-outline-variant/14 bg-surface px-3 text-body-default text-on-surface focus:border-primary focus:ring-0";
const labelClass = "font-label-compact text-label-compact text-on-surface-variant";

interface TenderEditModalProps {
  tender: Tender;
  onCancel: () => void;
  onSave: (data: TenderUpdatePayload) => void;
  saving: boolean;
}

function toDatetimeLocal(iso: string | null): string {
  if (!iso) return "";
  // <input type="datetime-local"> "YYYY-MM-DDTHH:mm" bekliyor, saniye/timezone istemiyor.
  return iso.slice(0, 16);
}

export function TenderEditModal({ tender, onCancel, onSave, saving }: TenderEditModalProps) {
  const [form, setForm] = useState<TenderUpdatePayload>({
    title: tender.title,
    tender_type: tender.tender_type,
    procedure: tender.procedure,
    tender_datetime: tender.tender_datetime,
    unit: tender.unit,
    description: tender.description,
    delivery_place: tender.delivery_place,
    duration: tender.duration,
    venue: tender.venue,
    address: tender.address,
    phone: tender.phone,
    detail_url: tender.detail_url,
    doc_url: tender.doc_url,
    province: tender.province,
    institution: tender.institution,
  });

  function setField<K extends keyof TenderUpdatePayload>(key: K, value: TenderUpdatePayload[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCancel}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-2xl flex-col gap-4 overflow-y-auto rounded bg-surface p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          İhaleyi Düzenle
        </h3>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Başlık</span>
          <input
            className={fieldClass}
            value={form.title ?? ""}
            onChange={(e) => setField("title", e.target.value)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Tür</span>
            <select
              className={fieldClass}
              value={form.tender_type}
              onChange={(e) => setField("tender_type", e.target.value as TenderType)}
            >
              {(Object.entries(TENDER_TYPE_LABELS) as [TenderType, string][]).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Tarih/Saat</span>
            <input
              type="datetime-local"
              className={fieldClass}
              value={toDatetimeLocal(form.tender_datetime ?? null)}
              onChange={(e) => setField("tender_datetime", e.target.value || null)}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Şehir</span>
            <input
              className={fieldClass}
              value={form.province ?? ""}
              onChange={(e) => setField("province", e.target.value || null)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Kurum</span>
            <input
              className={fieldClass}
              value={form.institution ?? ""}
              onChange={(e) => setField("institution", e.target.value || null)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Usul</span>
          <input
            className={fieldClass}
            value={form.procedure ?? ""}
            onChange={(e) => setField("procedure", e.target.value || null)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Birim</span>
          <input
            className={fieldClass}
            value={form.unit ?? ""}
            onChange={(e) => setField("unit", e.target.value || null)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Açıklama</span>
          <textarea
            className={`${fieldClass} h-24 py-2`}
            value={form.description ?? ""}
            onChange={(e) => setField("description", e.target.value || null)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Teslim Yeri</span>
            <input
              className={fieldClass}
              value={form.delivery_place ?? ""}
              onChange={(e) => setField("delivery_place", e.target.value || null)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Süre</span>
            <input
              className={fieldClass}
              value={form.duration ?? ""}
              onChange={(e) => setField("duration", e.target.value || null)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>İhale Yeri</span>
          <input
            className={fieldClass}
            value={form.venue ?? ""}
            onChange={(e) => setField("venue", e.target.value || null)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Adres</span>
          <input
            className={fieldClass}
            value={form.address ?? ""}
            onChange={(e) => setField("address", e.target.value || null)}
          />
        </label>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Telefon</span>
            <input
              className={fieldClass}
              value={form.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value || null)}
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className={labelClass}>Doküman URL</span>
            <input
              className={fieldClass}
              value={form.doc_url ?? ""}
              onChange={(e) => setField("doc_url", e.target.value || null)}
            />
          </label>
        </div>

        <label className="flex flex-col gap-1">
          <span className={labelClass}>Detay URL</span>
          <input
            className={fieldClass}
            value={form.detail_url ?? ""}
            onChange={(e) => setField("detail_url", e.target.value)}
          />
        </label>

        <div className="mt-2 flex justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="h-input-height rounded border border-outline-variant/14 px-4 font-label-compact text-label-compact text-on-surface"
          >
            Vazgeç
          </button>
          <button
            type="button"
            onClick={() => onSave(form)}
            disabled={saving}
            className="h-input-height rounded bg-primary px-4 font-label-compact text-label-compact text-on-primary disabled:opacity-50"
          >
            {saving ? "Kaydediliyor..." : "Kaydet"}
          </button>
        </div>
      </div>
    </div>
  );
}
