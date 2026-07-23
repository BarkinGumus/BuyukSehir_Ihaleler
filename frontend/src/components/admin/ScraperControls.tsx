"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CheckCircle2, Loader2, Play } from "lucide-react";
import {
  getScraperStatus,
  triggerScraper,
  type ScraperJobState,
  type ScraperSource,
} from "@/lib/api";

const SOURCE_LABELS: Record<ScraperSource, string> = {
  istanbul: "İBB",
  ankara: "Ankara Büyükşehir Belediyesi",
  kocaeli: "Kocaeli Büyükşehir Belediyesi",
  ilan_gov_tr: "ilan.gov.tr",
};

const SOURCES = Object.keys(SOURCE_LABELS) as ScraperSource[];

function resultSummary(job: ScraperJobState): string {
  if (!job.result) return "";
  const { new_count, updated_count, skipped } = job.result;
  return `${new_count} yeni, ${updated_count} güncellenen, ${skipped} elendi`;
}

function ScraperButton({
  source,
  job,
  onRun,
  disabled,
}: {
  source: ScraperSource;
  job: ScraperJobState | undefined;
  onRun: (source: ScraperSource) => void;
  disabled: boolean;
}) {
  const status = job?.status ?? "idle";
  const isRunning = status === "running";

  return (
    <div className="flex flex-col gap-2 rounded border border-outline-variant/14 bg-surface p-4">
      <span className="font-body-strong text-body-strong text-on-surface">
        {SOURCE_LABELS[source]}
      </span>
      <button
        type="button"
        onClick={() => onRun(source)}
        disabled={disabled || isRunning}
        className="flex h-input-height items-center justify-center gap-2 rounded bg-primary font-label-compact text-label-compact text-on-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {isRunning ? (
          <>
            <Loader2 size={14} className="animate-spin" />
            Çekiliyor...
          </>
        ) : (
          <>
            <Play size={14} />
            Çalıştır
          </>
        )}
      </button>
      {status === "done" && job?.result && (
        <span className="flex items-center gap-1 font-caption-mono text-caption-mono text-[#34D399]">
          <CheckCircle2 size={12} />
          {resultSummary(job)}
        </span>
      )}
      {status === "error" && (
        <span className="flex items-center gap-1 font-caption-mono text-caption-mono text-red-400">
          <AlertCircle size={12} />
          {job?.error ?? "Bilinmeyen hata"}
        </span>
      )}
    </div>
  );
}

export function ScraperControls() {
  const { getToken } = useAuth();
  const queryClient = useQueryClient();

  const { data: status } = useQuery({
    queryKey: ["admin-scraper-status"],
    queryFn: async () => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return getScraperStatus(token);
    },
    refetchInterval: 3000,
  });

  const anyRunning = status ? SOURCES.some((s) => status[s]?.status === "running") : false;

  const runMutation = useMutation({
    mutationFn: async (source: ScraperSource | "all") => {
      const token = await getToken();
      if (!token) throw new Error("Oturum bulunamadı");
      return triggerScraper(source, token);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-scraper-status"] });
    },
  });

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h3 className="font-headline-sm text-headline-sm font-semibold text-on-surface">
          Scraper Kontrolü
        </h3>
        <button
          type="button"
          onClick={() => runMutation.mutate("all")}
          disabled={anyRunning}
          className="flex h-input-height items-center justify-center gap-2 rounded border border-primary px-4 font-label-compact text-label-compact text-primary transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {anyRunning ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              Çekiliyor...
            </>
          ) : (
            <>
              <Play size={14} />
              Tümünü Çek
            </>
          )}
        </button>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {SOURCES.map((source) => (
          <ScraperButton
            key={source}
            source={source}
            job={status?.[source]}
            onRun={(s) => runMutation.mutate(s)}
            disabled={anyRunning}
          />
        ))}
      </div>
    </div>
  );
}
