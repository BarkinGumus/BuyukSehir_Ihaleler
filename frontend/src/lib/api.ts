import { mockTenders } from "./mock-data";
import type { Tender, TenderListResponse, TenderType } from "./types";

// Tüm veri çekme işlemleri bu dosyadan geçer. Şu an mock data üzerinde
// filtreliyor/sayfalıyoruz; Faz 7'de FastAPI hazır olunca burası gerçek
// `fetch("http://localhost:8000/tenders?...")` çağrısına dönüşecek,
// component'lere dokunmaya gerek kalmayacak (dönen şekil aynı kalıyor).

export type TenderStatusFilter = "aktif" | "gecmis";

export interface TenderFilters {
  city?: string;
  type?: TenderType;
  procedure?: string;
  status?: TenderStatusFilter;
  search?: string;
  dateFrom?: string; // YYYY-MM-DD
  dateTo?: string; // YYYY-MM-DD
  page?: number;
  pageSize?: number;
}

function matchesFilters(tender: Tender, filters: TenderFilters): boolean {
  if (filters.city && tender.province?.toLowerCase() !== filters.city.toLowerCase()) {
    return false;
  }
  if (filters.type && tender.tender_type !== filters.type) {
    return false;
  }
  if (filters.procedure && tender.procedure !== filters.procedure) {
    return false;
  }
  if (filters.status && tender.tender_datetime) {
    const isUpcoming = new Date(tender.tender_datetime) >= new Date();
    if (filters.status === "aktif" && !isUpcoming) return false;
    if (filters.status === "gecmis" && isUpcoming) return false;
  }
  if (filters.search) {
    const q = filters.search.toLowerCase();
    if (!tender.title.toLowerCase().includes(q)) {
      return false;
    }
  }
  if (filters.dateFrom && tender.tender_datetime) {
    if (tender.tender_datetime.slice(0, 10) < filters.dateFrom) return false;
  }
  if (filters.dateTo && tender.tender_datetime) {
    if (tender.tender_datetime.slice(0, 10) > filters.dateTo) return false;
  }
  return true;
}

// Ağdan veri çekiyormuş gibi davranmak için küçük bir gecikme - gerçek API'ye
// geçildiğinde davranış farkı hissedilmesin diye.
function simulateNetworkDelay<T>(value: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), 150));
}

export async function getTenders(filters: TenderFilters = {}): Promise<TenderListResponse> {
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 50;

  const filtered = mockTenders
    .filter((t) => matchesFilters(t, filters))
    .sort((a, b) => (a.tender_datetime ?? "").localeCompare(b.tender_datetime ?? ""));

  const start = (page - 1) * pageSize;
  const items = filtered.slice(start, start + pageSize);

  return simulateNetworkDelay({
    items,
    total: filtered.length,
    page,
    page_size: pageSize,
  });
}

export async function getTenderById(id: number): Promise<Tender | null> {
  return simulateNetworkDelay(mockTenders.find((t) => t.id === id) ?? null);
}

export interface TenderStats {
  total: number;
  newCount: number;
  upcomingCount: number;
  sourceCount: number;
}

// StatsRow'daki "Toplam / Yeni / Yaklaşan / Kaynak" değerleri - her zaman
// TÜM veri setinden hesaplanır, tablodaki mevcut filtrelerden etkilenmez.
export async function getTenderStats(): Promise<TenderStats> {
  const now = new Date();
  const sevenDaysAgo = new Date(now);
  sevenDaysAgo.setDate(now.getDate() - 7);
  const thirtyDaysAhead = new Date(now);
  thirtyDaysAhead.setDate(now.getDate() + 30);

  const newCount = mockTenders.filter((t) => new Date(t.first_seen_at) >= sevenDaysAgo).length;

  const upcomingCount = mockTenders.filter((t) => {
    if (!t.tender_datetime) return false;
    const d = new Date(t.tender_datetime);
    return d >= now && d <= thirtyDaysAhead;
  }).length;

  const sourceCount = new Set(mockTenders.map((t) => t.source)).size;

  return simulateNetworkDelay({
    total: mockTenders.length,
    newCount,
    upcomingCount,
    sourceCount,
  });
}

export interface TenderFilterOptions {
  cities: string[];
  procedures: string[];
}

// FilterBar'daki "Şehir" ve "Usul" seçenekleri - sabit/uydurma bir liste
// yerine veri setinde gerçekten var olan değerlerden türetiliyor.
export async function getTenderFilterOptions(): Promise<TenderFilterOptions> {
  const cities = [...new Set(mockTenders.map((t) => t.province).filter(Boolean))] as string[];
  const procedures = [...new Set(mockTenders.map((t) => t.procedure).filter(Boolean))] as string[];
  return simulateNetworkDelay({ cities: cities.sort(), procedures: procedures.sort() });
}
