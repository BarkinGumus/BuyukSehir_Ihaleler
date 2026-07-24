"use client";

import { ChevronDown, ChevronUp, Terminal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { ScraperSource, ScraperStatusResponse } from "@/lib/api";

const SOURCE_LABELS: Record<ScraperSource, string> = {
  istanbul: "İBB",
  ankara: "Ankara Büyükşehir Belediyesi",
  kocaeli: "Kocaeli Büyükşehir Belediyesi",
  ilan_gov_tr: "ilan.gov.tr",
};

const SOURCES = Object.keys(SOURCE_LABELS) as ScraperSource[];

// Admin panelinde scraper çalışırken gerçek log satırlarını (HTTP istekleri,
// hata mesajları) gösteren isteğe bağlı (aç/kapa) bir terminal paneli - bir
// hata alındığında ekstra bir yere bakmadan burada görülebilsin diye.
export function TerminalPanel({ status }: { status: ScraperStatusResponse | undefined }) {
  const [visible, setVisible] = useState(false);
  const [activeSource, setActiveSource] = useState<ScraperSource>("istanbul");
  const scrollRef = useRef<HTMLDivElement>(null);

  const logs = status?.[activeSource]?.logs ?? [];

  // Yeni log satırı gelince otomatik en alta kaydır - dizinin kendisi (referansı)
  // değil uzunluğu ve son satırı takip ediyoruz, her render'da yeniden tetiklenmesin.
  const lastLog = logs.at(-1);
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs.length, lastLog]);

  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="flex w-fit items-center gap-2 text-body-default text-on-surface-variant hover:text-on-surface"
      >
        <Terminal size={16} />
        <span>Terminal</span>
        {visible ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>

      {visible && (
        <div className="flex flex-col overflow-hidden rounded border border-outline-variant/14">
          <div className="flex flex-wrap gap-1 border-b border-outline-variant/14 bg-surface-container-lowest p-1">
            {SOURCES.map((source) => {
              const sourceStatus = status?.[source]?.status ?? "idle";
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => setActiveSource(source)}
                  className={`flex items-center gap-1.5 rounded-sm px-2 py-1 font-label-compact text-label-compact transition-colors ${
                    activeSource === source
                      ? "bg-surface-variant text-on-surface"
                      : "text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${
                      sourceStatus === "running"
                        ? "bg-[#F59E0B]"
                        : sourceStatus === "error"
                          ? "bg-red-400"
                          : sourceStatus === "done"
                            ? "bg-[#34D399]"
                            : "bg-on-surface-variant/40"
                    }`}
                  />
                  {SOURCE_LABELS[source]}
                </button>
              );
            })}
          </div>
          <div
            ref={scrollRef}
            className="h-64 overflow-y-auto bg-black px-3 py-2 font-data-mono text-[12px] leading-relaxed text-[#D4D4D4]"
          >
            {logs.length === 0 ? (
              <span className="text-[#6B7280]">Henüz log yok.</span>
            ) : (
              logs.map((line, i) => (
                <div key={i} className={line.startsWith("HATA") ? "text-red-400" : undefined}>
                  {line}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
