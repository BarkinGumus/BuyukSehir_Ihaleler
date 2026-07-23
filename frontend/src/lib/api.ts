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

// Analytics endpoint'lerinin ortak filtresi - /tenders'dakinden farklı olarak
// institution/unit var, status/search/page yok (analiz her zaman tüm sonuç
// kümesi üzerinden aggregate hesaplanıyor, sayfalama gerekmiyor).
export interface AnalyticsFilters {
  city?: string;
  source?: string;
  type?: TenderType;
  procedure?: string;
  institution?: string;
  unit?: string;
  dateFrom?: string;
  dateTo?: string;
}

function analyticsParams(filters: AnalyticsFilters): Record<string, string | undefined> {
  return {
    city: filters.city,
    source: filters.source,
    type: filters.type,
    procedure: filters.procedure,
    institution: filters.institution,
    unit: filters.unit,
    date_from: filters.dateFrom,
    date_to: filters.dateTo,
  };
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
  institutions: string[];
  units: string[];
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

// --- Analiz paneli (/dashboard) ---

export interface KpiData {
  total: number;
  todayAdded: number;
  active: number;
  endingToday: number;
  institutionCount: number;
  thisMonthTotal: number;
  lastMonthTotal: number;
  monthOverMonthPct: number | null;
}

interface KpiApiResponse {
  total: number;
  today_added: number;
  active: number;
  ending_today: number;
  institution_count: number;
  this_month_total: number;
  last_month_total: number;
  month_over_month_pct: number | null;
}

export async function getKpis(filters: AnalyticsFilters): Promise<KpiData> {
  const data = await fetchJSON<KpiApiResponse>("/analytics/kpis", analyticsParams(filters));
  return {
    total: data.total,
    todayAdded: data.today_added,
    active: data.active,
    endingToday: data.ending_today,
    institutionCount: data.institution_count,
    thisMonthTotal: data.this_month_total,
    lastMonthTotal: data.last_month_total,
    monthOverMonthPct: data.month_over_month_pct,
  };
}

export interface CountBucket {
  label: string;
  count: number;
}

export type TrendGranularity = "day" | "week" | "month" | "year";

export interface TrendsData {
  granularity: TrendGranularity;
  series: CountBucket[];
  byWeekday: CountBucket[];
  byMonthOfYear: CountBucket[];
  avgPublishLeadDays: number | null;
}

interface TrendsApiResponse {
  granularity: TrendGranularity;
  series: CountBucket[];
  by_weekday: CountBucket[];
  by_month_of_year: CountBucket[];
  avg_publish_lead_days: number | null;
}

export async function getTrends(
  granularity: TrendGranularity,
  filters: AnalyticsFilters,
): Promise<TrendsData> {
  const data = await fetchJSON<TrendsApiResponse>("/analytics/trends", {
    granularity,
    ...analyticsParams(filters),
  });
  return {
    granularity: data.granularity,
    series: data.series,
    byWeekday: data.by_weekday,
    byMonthOfYear: data.by_month_of_year,
    avgPublishLeadDays: data.avg_publish_lead_days,
  };
}

export interface ProvinceTypeBucket {
  province: string;
  tender_type: TenderType;
  count: number;
}

export interface GeographyData {
  byProvince: CountBucket[];
  byProvinceAndType: ProvinceTypeBucket[];
}

export async function getGeography(filters: AnalyticsFilters): Promise<GeographyData> {
  const data = await fetchJSON<{ by_province: CountBucket[]; by_province_and_type: ProvinceTypeBucket[] }>(
    "/analytics/geography",
    analyticsParams(filters),
  );
  return { byProvince: data.by_province, byProvinceAndType: data.by_province_and_type };
}

export interface InstitutionUnitBucket {
  institution: string;
  unit: string | null;
  count: number;
}

export interface InstitutionMonthlyBucket {
  institution: string;
  month: string;
  count: number;
}

export interface InstitutionsData {
  topInstitutions: CountBucket[];
  topInstitutionUnits: InstitutionUnitBucket[];
  institutionMonthly: InstitutionMonthlyBucket[];
}

export async function getInstitutions(filters: AnalyticsFilters): Promise<InstitutionsData> {
  const data = await fetchJSON<{
    top_institutions: CountBucket[];
    top_institution_units: InstitutionUnitBucket[];
    institution_monthly: InstitutionMonthlyBucket[];
  }>("/analytics/institutions", analyticsParams(filters));
  return {
    topInstitutions: data.top_institutions,
    topInstitutionUnits: data.top_institution_units,
    institutionMonthly: data.institution_monthly,
  };
}

export interface KeywordBucket {
  word: string;
  count: number;
}

export interface ContentData {
  byTenderType: CountBucket[];
  byProcedure: CountBucket[];
  topKeywords: KeywordBucket[];
}

export async function getContent(filters: AnalyticsFilters): Promise<ContentData> {
  const data = await fetchJSON<{
    by_tender_type: CountBucket[];
    by_procedure: CountBucket[];
    top_keywords: KeywordBucket[];
  }>("/analytics/content", analyticsParams(filters));
  return {
    byTenderType: data.by_tender_type,
    byProcedure: data.by_procedure,
    topKeywords: data.top_keywords,
  };
}
