"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import type { SalesInvoice } from "@/types/delivery-order";

export function InvoiceDetail({ invoice }: { invoice: SalesInvoice }) {
  const totals = calculateSalesInvoiceTotals(invoice);

  return (
    <div className="space-y-6">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Kembali ke Daftar Invoice
      </Link>

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Invoice</p>
            <h2 className="mt-2 text-2xl font-semibold tracking-tight md:text-3xl">{invoice.invoiceNumber}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{invoice.customerName} · {formatDateID(invoice.invoiceDate)}</p>
          </div>
          <InvoiceStatusBadge invoice={invoice} />
        </div>
      </section>

      <section className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader><CardTitle>Billing</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoLine label="Customer" value={invoice.customerBillingDetails.name} />
            <InfoLine label="Alamat" value={invoice.customerBillingDetails.address} />
            <InfoLine label="NPWP" value={invoice.customerBillingDetails.taxId} />
            <InfoLine label="PO / Ref" value={invoice.purchaseOrderReference} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Scope</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoLine label="DO Group" value={String(totals.groups.length)} />
            <InfoLine label="Transaksi" value={String(invoice.transactionIds.length)} />
            <InfoLine label="Total Tonase" value={formatTonnage(invoice.lines.reduce((sum, line) => sum + line.tonnage, 0))} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle>Total</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <InfoLine label="Subtotal" value={formatRupiah(totals.subtotal)} />
            <InfoLine label="PPh 23" value={`-${formatRupiah(totals.pph23Amount)}`} />
            <InfoLine label="DP Sewa" value={`-${formatRupiah(totals.rentalDepositDeduction)}`} />
            <InfoLine label="Grand Total" value={formatRupiah(totals.grandTotal)} strong />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Line Snapshot by Delivery Order</CardTitle>
          <CardDescription>Nilai invoice berasal dari snapshot immutable saat invoice diterbitkan.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {totals.groups.map((group) => {
            const rates = new Set(group.lines.map((line) => line.salesRatePerTon));
            return (
              <section key={group.deliveryOrderId} className="rounded-lg border p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="font-semibold">{group.doNumber}</p>
                    <p className="text-sm text-muted-foreground">{group.lines.length} transaksi · {formatTonnage(group.groupTonnage)}</p>
                  </div>
                  <p className="text-sm text-muted-foreground">Tarif: {rates.size === 1 ? formatRupiah(group.lines[0].salesRatePerTon) : "Mixed rates"}</p>
                </div>
                <div className="mt-4 grid gap-2 text-sm sm:grid-cols-4">
                  <InfoLine label="Hauling" value={formatRupiah(group.groupHaulageAmount)} />
                  <InfoLine label="Uang Jalan" value={formatRupiah(group.groupRoadMoney)} />
                  <InfoLine label="Subtotal" value={formatRupiah(group.groupSubtotal)} strong />
                </div>
              </section>
            );
          })}
        </CardContent>
      </Card>

      {invoice.notes ? (
        <Card>
          <CardHeader><CardTitle>Notes</CardTitle></CardHeader>
          <CardContent className="text-sm text-muted-foreground">{invoice.notes}</CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function InvoiceStatusBadge({ invoice }: { invoice: SalesInvoice }) {
  if (invoice.status === "PAID") return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
  if (invoice.status === "CANCELLED") return <Badge variant="outline" className="text-destructive">Cancelled</Badge>;
  return <Badge variant="outline">Issued</Badge>;
}

function InfoLine({ label, value, strong = false }: { label: string; value?: string; strong?: boolean }) {
  return (
    <div className="flex justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-semibold" : "font-medium"}>{value || "-"}</span>
    </div>
  );
}
