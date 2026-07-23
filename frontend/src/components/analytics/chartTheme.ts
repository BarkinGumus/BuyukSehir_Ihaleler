// Recharts'a doğrudan CSS custom property string'i veriliyor (örn. "var(--primary)")
// - next-themes'in <html> etiketine eklediği "dark" class'ı bu değişkenleri
// otomatik günceller, grafiklerin ayrıca JS ile tema takip etmesine gerek kalmıyor.
export const CHART_COLORS = [
  "var(--primary)",
  "var(--tertiary)",
  "var(--secondary)",
  "#34D399",
  "#F59E0B",
  "#60A5FA",
  "#F472B6",
];

export const GRID_COLOR = "var(--outline-variant)";
export const AXIS_COLOR = "var(--on-surface-variant)";
export const TOOLTIP_STYLE = {
  backgroundColor: "var(--surface-container-high)",
  border: "1px solid var(--outline-variant)",
  borderRadius: 4,
  color: "var(--on-surface)",
  fontSize: 12,
};
