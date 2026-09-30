"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer, X } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import {
  calculateInvoiceTotals,
  calculateOrderInvoiceTotals,
  canCreateInvoice,
  generateDemoInvoiceNumber,
  getInvoicePaymentStatus,
  hasInvoice,
} from "@/lib/invoice";
import { downloadInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { cn } from "@/lib/utils";
import type { DeliveryOrder } from "@/types/delivery-order";

interface InvoiceMakerProps {
  initialOrder: DeliveryOrder;
}

const today = new Date().toISOString().slice(0, 10);

export function InvoiceMaker({ initialOrder }: InvoiceMakerProps) {
  const [order, setOrder] = useState<DeliveryOrder>(initialOrder);
  const [toastMessage, setToastMessage] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(today);
  const [sellingPrice, setSellingPrice] = useState(String(initialOrder.sellingPrice));
  const [salesGasMoney, setSalesGasMoney] = useState(String(initialOrder.salesGasMoney));
  const invoiceNumber = order.salesInvoiceNumber ?? generateDemoInvoiceNumber(order);
  const formTotals = useMemo(
    () => calculateInvoiceTotals(Number(sellingPrice) || 0, Number(salesGasMoney) || 0),
    [sellingPrice, salesGasMoney],
  );

  function handleCreateInvoice() {
    setOrder((current) => ({
      ...current,
      salesInvoiceNumber: invoiceNumber,
      salesInvoiceDate: invoiceDate,
      sellingPrice: formTotals.baseSalesValue,
      salesGasMoney: formTotals.gasMoney,
      salesPph23: formTotals.pph23,
      salesTotal: formTotals.netTotal,
      status: "WAITING_CUSTOMER_PAYMENT",
    }));
    setToastMessage("Invoice berhasil dibuat.");
  }

  return (
    <div className="space-y-6">
      <Link
        href="/invoices"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Daftar Invoice
      </Link>

      {toastMessage ? (
        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            aria-label="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
        </div>
      ) : null}

      {canCreateInvoice(order) ? (
        <InvoiceCreationMode
          order={order}
          invoiceNumber={invoiceNumber}
          invoiceDate={invoiceDate}
          sellingPrice={sellingPrice}
          salesGasMoney={salesGasMoney}
          totals={formTotals}
          onInvoiceDateChange={setInvoiceDate}
          onSellingPriceChange={setSellingPrice}
          onSalesGasMoneyChange={setSalesGasMoney}
          onCreateInvoice={handleCreateInvoice}
        />
      ) : hasInvoice(order) ? (
        <InvoicePreview order={order} />
      ) : (
        <InvoiceBlockedState order={order} />
      )}
    </div>
  );
}

function InvoiceCreationMode({
  order,
  invoiceNumber,
  invoiceDate,
  sellingPrice,
  salesGasMoney,
  totals,
  onInvoiceDateChange,
  onSellingPriceChange,
  onSalesGasMoneyChange,
  onCreateInvoice,
}: {
  order: DeliveryOrder;
  invoiceNumber: string;
  invoiceDate: string;
  sellingPrice: string;
  salesGasMoney: string;
  totals: ReturnType<typeof calculateInvoiceTotals>;
  onInvoiceDateChange: (value: string) => void;
  onSellingPriceChange: (value: string) => void;
  onSalesGasMoneyChange: (value: string) => void;
  onCreateInvoice: () => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Buat Invoice Penjualan
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Invoice akan dibuat berdasarkan data Delivery Order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Referensi Delivery Order</CardTitle>
          <CardDescription>
            Data operasional otomatis digunakan ulang, sehingga tidak perlu diketik kembali.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm md:grid-cols-3">
          <InfoMini label="No DO" value={order.doNumber} />
          <InfoMini label="Tambang" value={order.customerName} />
          <InfoMini label="Mitra" value={order.partnerName} />
          <InfoMini label="Tanggal Muat" value={formatDateID(order.loadingDate)} />
          <InfoMini label="Tonase" value={formatTonnage(order.tonnage)} />
          <InfoMini label="Rute" value={`${order.originMine} -> ${order.destinationPort}`} />
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Informasi Invoice</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <FormInput label="Tanggal Invoice*" type="date" value={invoiceDate} onChange={onInvoiceDateChange} />
            <ReadOnlyField label="No Invoice" value={invoiceNumber} />
            <ReadOnlyField label="Nama Tambang" value={order.customerName} />
            <div className="grid gap-4 md:grid-cols-2">
              <FormInput label="Harga Jual*" type="number" value={sellingPrice} onChange={onSellingPriceChange} />
              <FormInput label="Uang Pijak Gas" type="number" value={salesGasMoney} onChange={onSalesGasMoneyChange} />
            </div>
            <ReadOnlyField label="PPh 23" value={formatRupiah(totals.pph23)} />
            <ReadOnlyField label="Total Penjualan / Net Diterima" value={formatRupiah(totals.netTotal)} />
            <p className="text-xs text-muted-foreground">
              PPh 23 demo dihitung 2%. `sellingPrice` mengikuti model saat ini sebagai total nilai jual dasar, bukan harga per ton.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan</CardTitle>
            <CardDescription>Total invoice sebelum konfirmasi.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <SummaryLine label="Nilai Penjualan" value={formatRupiah(totals.baseSalesValue)} />
            <SummaryLine label="Uang Pijak Gas" value={formatRupiah(totals.gasMoney)} />
            <SummaryLine label="Subtotal" value={formatRupiah(totals.grossSales)} />
            <SummaryLine label="PPh 23 (2%)" value={`-${formatRupiah(totals.pph23)}`} />
            <SummaryLine label="Total Invoice / Net" value={formatRupiah(totals.netTotal)} highlight />
            <div className="flex justify-end gap-2 pt-3">
              <Link href="/invoices" className={cn(buttonVariants({ variant: "outline" }))}>
                Batal
              </Link>
              <Button type="button" onClick={onCreateInvoice}>
                Buat Invoice
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function InvoicePreview({ order }: { order: DeliveryOrder }) {
  const totals = calculateOrderInvoiceTotals(order);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Preview Invoice Penjualan
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Invoice penjualan berdasarkan Delivery Order {order.doNumber}.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href={`/delivery-orders/${order.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
            Kembali ke DO
          </Link>
          <Button type="button" variant="outline" onClick={() => window.print()}>
            <Printer />
            Print
          </Button>
          <Button type="button" onClick={() => downloadInvoicePdf(order)}>
            <Download />
            Download PDF
          </Button>
        </div>
      </div>

      <article className="mx-auto max-w-4xl rounded-lg border bg-white p-6 text-zinc-950 shadow-sm md:p-10">
        <header className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-lg font-bold">[NAMA PERUSAHAAN]</p>
            <p className="mt-1 text-sm text-zinc-600">[Alamat Perusahaan]</p>
            <p className="text-sm text-zinc-600">[Telepon / Email]</p>
          </div>
          <div className="text-left sm:text-right">
            <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
            <p className="mt-2 text-sm">No Invoice: <span className="font-semibold">{order.salesInvoiceNumber}</span></p>
            <p className="text-sm">Tanggal: {formatDateID(order.salesInvoiceDate)}</p>
          </div>
        </header>

        <section className="grid gap-6 border-b py-6 md:grid-cols-2">
          <div>
            <h3 className="font-semibold">Ditagihkan Kepada</h3>
            <p className="mt-2 font-medium">{order.customerName}</p>
            <p className="text-sm text-zinc-600">Alamat Tambang: -</p>
            <p className="text-sm text-zinc-600">NPWP: -</p>
          </div>
          <div>
            <h3 className="font-semibold">Status Pembayaran</h3>
            <div className="mt-2"><InvoicePaymentBadge order={order} /></div>
            {order.customerPaidAt ? <p className="mt-2 text-sm">Tanggal Pembayaran: {formatDateID(order.customerPaidAt)}</p> : null}
          </div>
        </section>

        <section className="grid gap-3 border-b py-6 text-sm md:grid-cols-2">
          <InfoMini label="No DO" value={order.doNumber} />
          <InfoMini label="Tanggal Muat" value={formatDateID(order.loadingDate)} />
          <InfoMini label="No Polisi" value={order.truckPlate} />
          <InfoMini label="Nama Pengemudi" value={order.driverName} />
          <InfoMini label="Mitra" value={order.partnerName} />
          <InfoMini label="Tambang Asal" value={order.originMine} />
          <InfoMini label="Pelabuhan Tujuan" value={order.destinationPort} />
        </section>

        <div className="overflow-x-auto py-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-zinc-100 text-left">
                <th className="p-3">Deskripsi</th>
                <th className="p-3">Tonase</th>
                <th className="p-3 text-right">Harga</th>
                <th className="p-3 text-right">Jumlah</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b">
                <td className="p-3">Jasa Angkut DO {order.doNumber}</td>
                <td className="p-3">{formatTonnage(order.tonnage)}</td>
                <td className="p-3 text-right">{formatRupiah(order.sellingPrice)}</td>
                <td className="p-3 text-right">{formatRupiah(order.sellingPrice)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <section className="ml-auto max-w-sm space-y-2 text-sm">
          <InvoiceTotalLine label="Subtotal" value={formatRupiah(totals.baseSalesValue)} />
          <InvoiceTotalLine label="Uang Pijak Gas" value={formatRupiah(totals.gasMoney)} />
          <InvoiceTotalLine label="Total Sebelum PPh 23" value={formatRupiah(totals.grossSales)} />
          <InvoiceTotalLine label="PPh 23 (2%)" value={`-${formatRupiah(totals.pph23)}`} />
          <InvoiceTotalLine label="Total Setelah PPh 23" value={formatRupiah(totals.netTotal)} strong />
        </section>
      </article>
    </div>
  );
}

function InvoiceBlockedState({ order }: { order: DeliveryOrder }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice belum dapat dibuat.</CardTitle>
        <CardDescription>
          Pembayaran ke mitra harus dicatat terlebih dahulu sebelum invoice penjualan dapat dibuat.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Link href={`/delivery-orders/${order.id}`} className={cn(buttonVariants())}>
          Kembali ke Detail DO
        </Link>
      </CardContent>
    </Card>
  );
}

function InvoicePaymentBadge({ order }: { order: DeliveryOrder }) {
  return order.customerPaidAt ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      {getInvoicePaymentStatus(order)}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-zinc-700">
      {getInvoicePaymentStatus(order)}
    </Badge>
  );
}

function FormInput({ label, value, onChange, type }: { label: string; value: string; onChange: (value: string) => void; type: "date" | "number" }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
      />
    </label>
  );
}

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-sm font-medium">{label}</p>
      <p className="mt-2 rounded-md border bg-muted/40 px-3 py-2 text-sm">{value}</p>
    </div>
  );
}

function InfoMini({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-zinc-500 dark:text-muted-foreground">{label}</p>
      <p className="mt-1 font-medium">{value}</p>
    </div>
  );
}

function SummaryLine({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-4 rounded-md border p-3", highlight ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40" : "")}>
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function InvoiceTotalLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 border-b py-2", strong ? "border-t-2 text-base font-bold" : "")}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
