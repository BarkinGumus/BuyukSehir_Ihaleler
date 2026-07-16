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
