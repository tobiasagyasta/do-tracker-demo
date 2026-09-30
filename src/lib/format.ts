import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateID(date?: string): string {
  if (!date) {
    return "-";
  }

  return format(new Date(date), "d MMMM yyyy", { locale: id });
}
