// Backend'deki api/schemas.py::TenderOut ile birebir aynı - alan eklenip
// çıkarıldığında ikisini birlikte güncelle.

export type TenderType =
  | "mal_alimi"
  | "hizmet_alimi"
  | "yapim_isi"
  | "tasinmaz_satis"
  | "kiralama"
  | "kat_karsiligi"
  | "diger";

export interface Tender {
  id: number;
  source: string;
  external_id: string;
  ikn: string | null;
  title: string;
  tender_type: TenderType;
  procedure: string | null;
  tender_datetime: string | null; // ISO 8601
  unit: string | null;
  status: string | null;
  description: string | null;
  delivery_place: string | null;
  duration: string | null;
  venue: string | null;
  address: string | null;
  phone: string | null;
  detail_url: string;
  doc_url: string | null;
  province: string | null;
  institution: string | null;
  raw_data: Record<string, unknown>;
  first_seen_at: string; // ISO 8601
  last_seen_at: string; // ISO 8601
}

export interface TenderListResponse {
  items: Tender[];
  total: number;
  page: number;
  page_size: number;
}

export const TENDER_TYPE_LABELS: Record<TenderType, string> = {
  mal_alimi: "Mal Alımı",
  hizmet_alimi: "Hizmet Alımı",
  yapim_isi: "Yapım İşi",
  tasinmaz_satis: "Taşınmaz Satışı",
  kiralama: "Kiralama",
  kat_karsiligi: "Kat Karşılığı",
  diger: "Diğer",
};
