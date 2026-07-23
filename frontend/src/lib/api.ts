import type { Tender, TenderListResponse, TenderType } from "./types";

// Tüm veri çekme işlemleri bu dosyadan geçer - component'ler bu fonksiyonların
// mock mu gerçek API mi kullandığını bilmez/bilmemeli.
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export type TenderStatusFilter = "aktif" | "gecmis";

export interface TenderFilters {
  city?: string;
  source?: string;
  type?: TenderType;
  procedure?: string;
  status?: TenderStatusFilter;
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

async function fetchJSON<T>(path: string, params: Record<string, string | number | undefined> = {}): Promise<T> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      query.set(key, String(value));
    }
  }
  const qs = query.toString();
  const url = `${API_BASE_URL}${path}${qs ? `?${qs}` : ""}`;

  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`API isteği başarısız: ${path} (${res.status})`);
  }
  return res.json() as Promise<T>;
}

// Admin işlemleri Clerk oturum token'ı gerektiriyor - token, çağıran component'te
// useAuth().getToken() ile alınıp buraya parametre olarak geçiriliyor (bu dosya
// Clerk hook'larını doğrudan çağıramaz, hook değil).
async function authedRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.detail ?? `İstek başarısız: ${path} (${res.status})`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function getTenders(filters: TenderFilters = {}): Promise<TenderListResponse> {
  return fetchJSON<TenderListResponse>("/tenders", {
    city: filters.city,
    source: filters.source,
    type: filters.type,
    procedure: filters.procedure,
    status: filters.status,
    search: filters.search,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
    page: filters.page ?? 1,
    page_size: filters.pageSize ?? 50,
  });
}

export async function getTenderById(id: number): Promise<Tender | null> {
  try {
    return await fetchJSON<Tender>(`/tenders/${id}`);
  } catch {
    return null;
  }
}

export interface TenderStats {
  total: number;
  newCount: number;
  upcomingCount: number;
  sourceCount: number;
}

interface TenderStatsApiResponse {
  total: number;
  new_count: number;
  upcoming_count: number;
  source_count: number;
}

export async function getTenderStats(): Promise<TenderStats> {
  const data = await fetchJSON<TenderStatsApiResponse>("/tenders/stats");
  return {
    total: data.total,
    newCount: data.new_count,
    upcomingCount: data.upcoming_count,
    sourceCount: data.source_count,
  };
}

export interface TenderFilterOptions {
  cities: string[];
  procedures: string[];
  sources: string[];
}

export async function getTenderFilterOptions(): Promise<TenderFilterOptions> {
  return fetchJSON<TenderFilterOptions>("/tenders/filter-options");
}

export interface TenderUpdatePayload {
  title?: string;
  tender_type?: TenderType;
  procedure?: string | null;
  tender_datetime?: string | null;
  unit?: string | null;
  description?: string | null;
  delivery_place?: string | null;
  duration?: string | null;
  venue?: string | null;
  address?: string | null;
  phone?: string | null;
  detail_url?: string;
  doc_url?: string | null;
  province?: string | null;
  institution?: string | null;
}

export async function updateTender(id: number, data: TenderUpdatePayload, token: string): Promise<Tender> {
  return authedRequest<Tender>(`/tenders/${id}`, token, {
    method: "PUT",
    body: JSON.stringify(data),
  });
}

export async function deleteTender(id: number, token: string): Promise<void> {
  await authedRequest<void>(`/tenders/${id}`, token, { method: "DELETE" });
}

export type ScraperSource = "istanbul" | "ankara" | "kocaeli" | "ilan_gov_tr";

export interface ScraperJobState {
  status: "idle" | "running" | "done" | "error";
  result: { new_count: number; updated_count: number; skipped: number; total_fetched: number } | null;
  error: string | null;
  finished_at: string | null;
}

export type ScraperStatusResponse = Record<ScraperSource, ScraperJobState>;

export async function getScraperStatus(token: string): Promise<ScraperStatusResponse> {
  return authedRequest<ScraperStatusResponse>("/admin/scrapers/status", token);
}

export async function triggerScraper(source: ScraperSource | "all", token: string): Promise<{ started: string[] }> {
  return authedRequest<{ started: string[] }>(`/admin/scrapers/${source}/run`, token, { method: "POST" });
}
