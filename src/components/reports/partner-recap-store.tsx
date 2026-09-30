"use client";

import { useMemo, useState } from "react";
import { Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateID, formatNumberID, formatRupiah } from "@/lib/format";
import {
  buildPartnerRecapRows,
  calculatePartnerRecapTotals,
  PARTNER_RECAP_LABEL,
  type PartnerRecapFilters,
} from "@/lib/partner-recap";
import { downloadPartnerRecapPdf } from "@/lib/pdf/partner-recap-pdf";
import {
  selectDeliveryOrderTransactions,
  selectDeliveryOrders,
  selectHasHydrated,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";
import { StoreLoading } from "@/components/store-loading";

const initialFilters: PartnerRecapFilters = {
  partnerName: "ALL",
  dateFrom: "",
  dateTo: "",
  deliveryOrderId: "ALL",
  paymentStatus: "ALL",
  category: "ALL",
};

export function PartnerRecapStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const deliveryOrders = useDemoStore(selectDeliveryOrders);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const updateTransaction = useDemoStore((state) => state.updateDeliveryOrderTransaction);
  const [filters, setFilters] = useState<PartnerRecapFilters>(initialFilters);
  const [message, setMessage] = useState("");

  const rows = useMemo(
    () => buildPartnerRecapRows({ deliveryOrders, transactions, filters }),
    [deliveryOrders, filters, transactions],
  );
  const totals = calculatePartnerRecapTotals(rows);
  const partnerNames = [...new Set(deliveryOrders.map((order) => order.partnerName))].sort((a, b) => a.localeCompare(b, "id-ID"));
  const categories = [...new Set(transactions.map((transaction) => transaction.category).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "id-ID"));

  if (!hasHydrated) return <StoreLoading />;

  function updateFilter<Key extends keyof PartnerRecapFilters>(key: Key, value: PartnerRecapFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function confirmPartnerPayment() {
    if (rows.length === 0) {
      setMessage("Tidak ada transaksi untuk dikonfirmasi.");
      return;
    }

    if (!window.confirm(`Tandai ${rows.length} transaksi di recap ini sebagai sudah dibayar ke mitra?`)) {
      return;
    }

    const paymentDate = new Date().toISOString().slice(0, 10);
    let updatedCount = 0;

    for (const row of rows) {
      if (row.transaction.partnerPaymentStatus === "PAID") continue;
      const result = updateTransaction(row.transaction.id, {
        partnerPaymentStatus: "PAID",
        partnerPaidAt: paymentDate,
      });
      if (result.ok) updatedCount += 1;
    }

    setMessage(`${updatedCount} transaksi ditandai sudah dibayar. SalesInvoice tidak diubah.`);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">{PARTNER_RECAP_LABEL}</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Rekap biaya angkutan mitra berbasis transaksi. Terpisah dari invoice customer.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer />Print</Button>
          <Button type="button" onClick={() => downloadPartnerRecapPdf(rows, filters)}><Download />Download PDF</Button>
        </div>
      </div>

      {message ? <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{message}</div> : null}

      <Card className="print:hidden">
        <CardHeader>
          <CardTitle>Filter</CardTitle>
          <CardDescription>Pilih cakupan recap mitra.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <Select label="Mitra" value={filters.partnerName} onChange={(value) => updateFilter("partnerName", value)} options={["ALL", ...partnerNames]} />
          <Input label="Tanggal Dari" type="date" value={filters.dateFrom} onChange={(value) => updateFilter("dateFrom", value)} />
          <Input label="Tanggal Sampai" type="date" value={filters.dateTo} onChange={(value) => updateFilter("dateTo", value)} />
          <Select label="Delivery Order" value={filters.deliveryOrderId} onChange={(value) => updateFilter("deliveryOrderId", value)} options={["ALL", ...deliveryOrders.map((order) => order.id)]} optionLabel={(value) => value === "ALL" ? "Semua DO" : deliveryOrders.find((order) => order.id === value)?.doNumber ?? value} />
          <Select label="Status Bayar" value={filters.paymentStatus} onChange={(value) => updateFilter("paymentStatus", value as PartnerRecapFilters["paymentStatus"])} options={["ALL", "PAID", "UNPAID"]} />
          <Select label="Kategori" value={filters.category} onChange={(value) => updateFilter("category", value)} options={["ALL", ...categories]} />
        </CardContent>
      </Card>

      <section className="grid gap-4 md:grid-cols-4">
        <SummaryCard label="Transaksi" value={String(rows.length)} />
        <SummaryCard label="Total Tonase" value={`${formatNumberID(totals.totalTonnage, 3)} ton`} />
        <SummaryCard label="Total Angkut" value={formatRupiah(totals.totalHauling)} />
        <SummaryCard label="Total Pembayaran" value={formatRupiah(totals.totalPayment)} />
      </section>

      <Card>
        <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle>Preview {PARTNER_RECAP_LABEL}</CardTitle>
            <CardDescription>Total gas/allowance: {formatRupiah(totals.totalGasMoney)}</CardDescription>
          </div>
          <Button type="button" variant="outline" onClick={confirmPartnerPayment}>Konfirmasi Pembayaran Mitra</Button>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full border-collapse text-sm tabular-nums">
            <thead>
              <tr className="bg-zinc-900 text-left text-white">
                {[
                  "No", "Nomor SPB", "No Polisi", "Supir", "Tanggal Muat", "Tanggal Bongkar", "Lokasi Muat", "Lokasi Bongkar", "Netto Tonase", "Kategori", "Tarif Angkut", "Total Angkut", "Uang/Gas", "Total Pembayaran", "Status",
                ].map((header) => <th key={header} className="border p-2">{header}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.transaction.id} className="even:bg-zinc-50">
                  <td className="border p-2 text-center">{index + 1}</td>
                  <td className="border p-2 font-medium">{row.transaction.transactionNumber}</td>
                  <td className="border p-2">{row.transaction.truckPlate}</td>
                  <td className="border p-2">{row.transaction.driverName}</td>
                  <td className="border p-2">{formatDateID(row.transaction.loadingDate)}</td>
                  <td className="border p-2">{formatDateID(row.transaction.unloadingDate)}</td>
                  <td className="border p-2">{row.transaction.loadingLocation}</td>
                  <td className="border p-2">{row.transaction.unloadingLocation}</td>
                  <td className="border p-2 text-right">{formatNumberID(row.transaction.tonnage, 3)}</td>
                  <td className="border p-2">{row.transaction.category ?? "-"}</td>
                  <td className="border p-2 text-right">{formatRupiah(row.transaction.partnerRatePerTon)}</td>
                  <td className="border p-2 text-right">{formatRupiah(row.haulingAmount)}</td>
                  <td className="border p-2 text-right">{formatRupiah(row.gasMoney)}</td>
                  <td className="border p-2 text-right font-semibold">{formatRupiah(row.totalPayment)}</td>
                  <td className="border p-2">{row.transaction.partnerPaymentStatus === "PAID" ? "Sudah Dibayar" : "Belum Dibayar"}</td>
                </tr>
              ))}
              <tr className="bg-emerald-50 font-semibold text-emerald-900">
                <td className="border p-2" colSpan={8}>TOTAL</td>
                <td className="border p-2 text-right">{formatNumberID(totals.totalTonnage, 3)}</td>
                <td className="border p-2" />
                <td className="border p-2" />
                <td className="border p-2 text-right">{formatRupiah(totals.totalHauling)}</td>
                <td className="border p-2 text-right">{formatRupiah(totals.totalGasMoney)}</td>
                <td className="border p-2 text-right">{formatRupiah(totals.totalPayment)}</td>
                <td className="border p-2" />
              </tr>
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <Card><CardHeader><CardTitle className="text-sm text-muted-foreground">{label}</CardTitle></CardHeader><CardContent className="text-xl font-semibold">{value}</CardContent></Card>;
}

function Input({ label, type = "text", value, onChange }: { label: string; type?: "text" | "date"; value: string; onChange: (value: string) => void }) {
  return <label className="block text-sm font-medium">{label}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30" /></label>;
}

function Select({ label, value, options, onChange, optionLabel }: { label: string; value: string; options: string[]; onChange: (value: string) => void; optionLabel?: (value: string) => string }) {
  return <label className="block text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none focus:border-ring focus:ring-3 focus:ring-ring/30">{options.map((option) => <option key={option} value={option}>{optionLabel ? optionLabel(option) : option === "ALL" ? "Semua" : option}</option>)}</select></label>;
}
