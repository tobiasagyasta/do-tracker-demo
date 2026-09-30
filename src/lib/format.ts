import { format } from "date-fns";
import { id } from "date-fns/locale";

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatNumberID(value: number, fractionDigits = 0): string {
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

export function formatTonnage3(value: number): string {
  return `${formatNumberID(value, 3)} ton`;
}

export function formatDateID(date?: string): string {
  if (!date) {
    return "-";
  }

  return format(new Date(date), "d MMMM yyyy", { locale: id });
}

const smallNumbers = [
  "",
  "satu",
  "dua",
  "tiga",
  "empat",
  "lima",
  "enam",
  "tujuh",
  "delapan",
  "sembilan",
  "sepuluh",
  "sebelas",
];

export function formatRupiahTerbilang(value: number): string {
  const rounded = Math.max(0, Math.round(value));

  if (rounded === 0) {
    return "nol rupiah";
  }

  return `${numberToIndonesianWords(rounded)} rupiah`;
}

function numberToIndonesianWords(value: number): string {
  if (value < 12) return smallNumbers[value];
  if (value < 20) return `${numberToIndonesianWords(value - 10)} belas`;
  if (value < 100) return joinWords(numberToIndonesianWords(Math.floor(value / 10)), "puluh", numberToIndonesianWords(value % 10));
  if (value < 200) return joinWords("seratus", numberToIndonesianWords(value - 100));
  if (value < 1000) return joinWords(numberToIndonesianWords(Math.floor(value / 100)), "ratus", numberToIndonesianWords(value % 100));
  if (value < 2000) return joinWords("seribu", numberToIndonesianWords(value - 1000));
  if (value < 1_000_000) return joinWords(numberToIndonesianWords(Math.floor(value / 1000)), "ribu", numberToIndonesianWords(value % 1000));
  if (value < 1_000_000_000) return joinWords(numberToIndonesianWords(Math.floor(value / 1_000_000)), "juta", numberToIndonesianWords(value % 1_000_000));
  if (value < 1_000_000_000_000) return joinWords(numberToIndonesianWords(Math.floor(value / 1_000_000_000)), "miliar", numberToIndonesianWords(value % 1_000_000_000));

  return joinWords(numberToIndonesianWords(Math.floor(value / 1_000_000_000_000)), "triliun", numberToIndonesianWords(value % 1_000_000_000_000));
}

function joinWords(...words: string[]): string {
  return words.filter(Boolean).join(" ").replace(/\s+/g, " ").trim();
}
