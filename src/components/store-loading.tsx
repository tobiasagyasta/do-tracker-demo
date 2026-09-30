export function StoreLoading({ label = "Memuat data demo..." }: { label?: string }) {
  return <p className="text-sm text-muted-foreground">{label}</p>;
}
