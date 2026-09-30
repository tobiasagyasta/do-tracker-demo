"use client";

import Link from "next/link";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/format";
import {
  formatDateID,
  formatNumberID,
  formatRupiahTerbilang,
  formatTonnage3,
} from "@/lib/format";
import { calculateSalesInvoiceTotals, type InvoiceGroupTotals } from "@/lib/invoice";
import { downloadSalesInvoicePdf } from "@/lib/pdf/invoice-pdf";
import { cn } from "@/lib/utils";
import type { SalesInvoice } from "@/types/delivery-order";

type PreviewTab = "invoice" | "attachment";

export function InvoiceDetail({ invoice }: { invoice: SalesInvoice }) {
  const [tab, setTab] = useState<PreviewTab>("invoice");
  const totals = calculateSalesInvoiceTotals(invoice);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
          <ArrowLeft className="size-4" />
          Kembali ke Daftar Invoice
        </Link>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}><Printer />Print Preview</Button>
          <Button type="button" onClick={() => downloadSalesInvoicePdf(invoice)}><Download />Download PDF</Button>
        </div>
      </div>

      <section className="rounded-lg border bg-card p-5 shadow-sm print:hidden">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Invoice</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{invoice.customerName} · {formatDateID(invoice.invoiceDate)}</p>
          </div>
          <InvoiceStatusBadge invoice={invoice} />
        </div>
      </section>

      <div className="flex gap-2 print:hidden" role="tablist" aria-label="Invoice preview sections">
        <Button type="button" variant={tab === "invoice" ? "default" : "outline"} onClick={() => setTab("invoice")}>Invoice</Button>
        <Button type="button" variant={tab === "attachment" ? "default" : "outline"} onClick={() => setTab("attachment")}>Lampiran Transaksi</Button>
      </div>

      {tab === "invoice" ? <InvoiceDocument invoice={invoice} groups={totals.groups} /> : null}
      {tab === "attachment" ? <AttachmentDocument invoice={invoice} groups={totals.groups} /> : null}

      <div className="hidden print:block">
        <AttachmentDocument invoice={invoice} groups={totals.groups} />
      </div>
    </div>
  );
}

function InvoiceDocument({ invoice, groups }: { invoice: SalesInvoice; groups: InvoiceGroupTotals[] }) {
  const totals = calculateSalesInvoiceTotals(invoice);
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);

  return (
    <article className="mx-auto max-w-[210mm] rounded-lg border bg-white p-8 text-zinc-950 shadow-sm print:rounded-none print:border-0 print:shadow-none">
      <DocumentHeader invoice={invoice} />
      <CustomerBlock invoice={invoice} />

      <section className="mt-8 overflow-x-auto">
        <table className="w-full border-collapse text-sm tabular-nums">
          <thead>
            <tr className="bg-zinc-900 text-left text-white">
              <th className="border border-zinc-300 p-2">Grup</th>
              <th className="border border-zinc-300 p-2">Deskripsi DO</th>
              <th className="border border-zinc-300 p-2 text-center">Unit</th>
              <th className="border border-zinc-300 p-2 text-right">Tonase</th>
              <th className="border border-zinc-300 p-2 text-right">Tarif</th>
              <th className="border border-zinc-300 p-2 text-right">Hauling</th>
              <th className="border border-zinc-300 p-2 text-right">Uang Jalan</th>
              <th className="border border-zinc-300 p-2 text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((group, index) => {
              const rates = new Set(group.lines.map((line) => line.salesRatePerTon));
              return (
                <tr key={group.deliveryOrderId} className="even:bg-zinc-50">
                  <td className="border border-zinc-300 p-2 text-center font-semibold">{String.fromCharCode(65 + index)}</td>
                  <td className="border border-zinc-300 p-2">
                    <p className="font-semibold">{group.doNumber}</p>
                    <p className="text-xs text-zinc-600">{group.lines[0]?.loadingLocation ?? "-"} - {group.lines[0]?.unloadingLocation ?? "-"}</p>
                  </td>
                  <td className="border border-zinc-300 p-2 text-center">{group.lines.length} trx</td>
                  <td className="border border-zinc-300 p-2 text-right">{formatNumberID(group.groupTonnage, 3)}</td>
                  <td className="border border-zinc-300 p-2 text-right">{rates.size === 1 ? formatRupiah(group.lines[0].salesRatePerTon) : "Mixed rates"}</td>
                  <td className="border border-zinc-300 p-2 text-right">{formatRupiah(group.groupHaulageAmount)}</td>
                  <td className="border border-zinc-300 p-2 text-right">{formatRupiah(group.groupRoadMoney)}</td>
                  <td className="border border-zinc-300 p-2 text-right font-semibold">{formatRupiah(group.groupSubtotal)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-[1fr_320px]">
        <div className="space-y-4 text-sm">
          <div className="rounded-md border p-4">
            <p className="font-semibold">Terbilang</p>
            <p className="mt-2 italic text-zinc-700">{formatRupiahTerbilang(totals.grandTotal)}</p>
          </div>
          <div className="rounded-md border p-4">
            <p className="font-semibold">Bank Details</p>
            <p className="mt-2 text-zinc-700">Bank: [Nama Bank]</p>
            <p className="text-zinc-700">No Rekening: [0000000000]</p>
            <p className="text-zinc-700">Atas Nama: [Nama Perusahaan]</p>
          </div>
        </div>
        <div className="space-y-2 text-sm tabular-nums">
          <TotalLine label="Total Tonase" value={formatTonnage3(totalTonnage)} />
          <TotalLine label="Subtotal" value={formatRupiah(totals.subtotal)} />
          <TotalLine label={`PPh 23 (${formatNumberID(invoice.pph23Rate * 100, 2)}%)`} value={`-${formatRupiah(totals.pph23Amount)}`} />
          <TotalLine label="Subtotal Setelah Pajak" value={formatRupiah(totals.totalAfterTax)} />
          <TotalLine label="DP Sewa" value={`-${formatRupiah(totals.rentalDepositDeduction)}`} />
          <TotalLine label="Grand Total" value={formatRupiah(totals.grandTotal)} strong />
        </div>
      </section>

      <section className="mt-10 flex justify-end text-sm">
        <div className="w-56 text-center">
          <p>Hormat kami,</p>
          <div className="h-20" />
          <div className="border-t border-zinc-400 pt-2">[Nama Penandatangan]</div>
        </div>
      </section>
    </article>
  );
}

function AttachmentDocument({ invoice, groups }: { invoice: SalesInvoice; groups: InvoiceGroupTotals[] }) {
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);

  return (
    <article className="mx-auto max-w-[210mm] rounded-lg border bg-white p-8 text-zinc-950 shadow-sm print:mt-8 print:break-before-page print:rounded-none print:border-0 print:shadow-none">
      <div className="border-b pb-4">
        <h2 className="text-xl font-bold tracking-tight">LAMPIRAN TRANSAKSI</h2>
        <p className="mt-2 text-sm text-zinc-600">Invoice: {invoice.invoiceNumber}</p>
        <p className="text-sm text-zinc-600">Customer: {invoice.customerName}</p>
      </div>

      <div className="mt-6 space-y-6">
        {groups.map((group, groupIndex) => (
          <section key={group.deliveryOrderId} className="overflow-x-auto">
            <div className="rounded-t-md border border-b-0 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-900">
              {String.fromCharCode(65 + groupIndex)}. {group.doNumber} · {group.lines.length} transaksi
            </div>
            <table className="w-full border-collapse text-sm tabular-nums">
              <thead>
                <tr className="bg-zinc-100 text-left">
                  <th className="border p-2 text-center">No</th>
                  <th className="border p-2">No SPB</th>
                  <th className="border p-2">No Polisi</th>
                  <th className="border p-2">Supir</th>
                  <th className="border p-2 text-right">Tonase</th>
                  <th className="border p-2 text-right">DP Sewa</th>
                </tr>
              </thead>
              <tbody>
                {group.lines.map((line, index) => (
                  <tr key={line.id} className="even:bg-zinc-50">
                    <td className="border p-2 text-center">{index + 1}</td>
                    <td className="border p-2 font-medium">{line.transactionNumber}</td>
                    <td className="border p-2">{line.truckPlate}</td>
                    <td className="border p-2">{line.driverName}</td>
                    <td className="border p-2 text-right">{formatNumberID(line.tonnage, 3)}</td>
                    <td className="border p-2 text-right">{line.rentalDeposit ? formatRupiah(line.rentalDeposit) : "-"}</td>
                  </tr>
                ))}
                <tr className="bg-zinc-100 font-semibold">
                  <td className="border p-2" colSpan={4}>Subtotal {group.doNumber}</td>
                  <td className="border p-2 text-right">{formatNumberID(group.groupTonnage, 3)}</td>
                  <td className="border p-2" />
                </tr>
              </tbody>
            </table>
          </section>
        ))}
      </div>

      <div className="mt-6 rounded-md border bg-zinc-100 p-3 text-right font-semibold tabular-nums">
        Total Tonase: {formatTonnage3(totalTonnage)}
      </div>
    </article>
  );
}

function DocumentHeader({ invoice }: { invoice: SalesInvoice }) {
  return (
    <header className="flex flex-col gap-6 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-lg font-bold">[NAMA PERUSAHAAN]</p>
        <p className="mt-1 text-sm text-zinc-600">[Alamat Perusahaan]</p>
        <p className="text-sm text-zinc-600">[Telepon / Email]</p>
        <div className="mt-4 flex h-14 w-32 items-center justify-center rounded border border-dashed text-xs text-zinc-500">LOGO</div>
      </div>
      <div className="text-left sm:text-right">
        <h1 className="text-3xl font-bold tracking-tight">INVOICE</h1>
        <p className="mt-2 text-sm">Tanggal: {formatDateID(invoice.invoiceDate)}</p>
        <p className="text-sm">No Invoice: <span className="font-semibold">{invoice.invoiceNumber}</span></p>
        <p className="text-sm">PO/Ref: {invoice.purchaseOrderReference || "-"}</p>
      </div>
    </header>
  );
}

function CustomerBlock({ invoice }: { invoice: SalesInvoice }) {
  return (
    <section className="mt-6 grid gap-6 md:grid-cols-2">
      <div>
        <h3 className="font-semibold">Ditagihkan Kepada</h3>
        <p className="mt-2 font-medium">{invoice.customerBillingDetails.name}</p>
        <p className="text-sm text-zinc-600">Alamat: {invoice.customerBillingDetails.address || "-"}</p>
        {invoice.customerBillingDetails.taxId ? <p className="text-sm text-zinc-600">NPWP: {invoice.customerBillingDetails.taxId}</p> : null}
      </div>
      <div className="rounded-md border bg-zinc-50 p-4 text-sm">
        <p className="font-semibold">Status Pembayaran</p>
        <div className="mt-2"><InvoiceStatusBadge invoice={invoice} /></div>
        {invoice.paymentDate ? <p className="mt-2 text-zinc-600">Tanggal Bayar: {formatDateID(invoice.paymentDate)}</p> : null}
      </div>
    </section>
  );
}

function TotalLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={cn("flex justify-between gap-4 border-b py-2", strong ? "border-t-2 text-base font-bold" : "")}> 
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function InvoiceStatusBadge({ invoice }: { invoice: SalesInvoice }) {
  if (invoice.status === "PAID") return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
  if (invoice.status === "CANCELLED") return <Badge variant="outline" className="text-destructive">Cancelled</Badge>;
  return <Badge variant="outline">Issued</Badge>;
}
