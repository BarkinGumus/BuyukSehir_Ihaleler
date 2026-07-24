import { AXIS_COLOR } from "./chartTheme";

interface TruncatedTickProps {
  x?: number;
  y?: number;
  payload?: { value: string };
  maxLength?: number;
}

// Kurum/usul gibi uzun metinli kategori eksenlerinde tam isim yerine kısaltılmış
// hali gösteriliyor (iç içe geçip kirli görünmesin diye) - tam isim yine de
// Tooltip'te (üzerine gelince) görünüyor, veri kaybı yok.
export function TruncatedTick({ x = 0, y = 0, payload, maxLength = 22 }: TruncatedTickProps) {
  if (!payload) return null;
  const text =
    payload.value.length > maxLength ? `${payload.value.slice(0, maxLength)}…` : payload.value;
  return (
    <text x={x} y={y} dy={4} textAnchor="end" fill={AXIS_COLOR} fontSize={10}>
      {text}
    </text>
  );
}
