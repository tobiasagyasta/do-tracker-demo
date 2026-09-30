"use client";

import Link from "next/link";
import { FilePlus2, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import type { DeliveryOrderTransaction, SalesInvoice } from "@/types/delivery-order";

interface InvoiceListProps {
  invoices: SalesInvoice[];
  eligibleTransactions: DeliveryOrderTransaction[];
}

type InvoiceFilter = "ALL" | "ISSUED" | "PAID" | "CANCELLED";

export function InvoiceList({ invoices, eligibleTransactions }: InvoiceListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("ALL");

  const filteredInvoices = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");

    return invoices.filter((invoice) => {
      const matchesSearch =
        query === "" ||
        [invoice.invoiceNumber, invoice.customerName, invoice.purchaseOrderReference].some(
          (value) => value?.toLocaleLowerCase("id-ID").includes(query),
        );
      const matchesFilter = filter === "ALL" || invoice.status === filter;

      return matchesSearch && matchesFilter;
    });
  }, [invoices, search, filter]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">Invoice</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Kelola invoice penjualan sebagai record independen lintas Delivery Order.
          </p>
        </div>
        <Link href="/invoices/new" className={cn(buttonVariants(), "shrink-0")}>
          <FilePlus2 />
          Buat Invoice
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1fr)_280px]">
        <Card>
          <CardHeader>
            <CardTitle>Eligibility Summary</CardTitle>
            <CardDescription>Transaksi siap invoice yang sudah dibayar ke mitra dan belum ditagih.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{eligibleTransactions.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">transaksi siap ditagih</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Total Invoice</CardTitle>
            <CardDescription>Semua status tersimpan.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-semibold">{invoices.length}</p>
            <p className="mt-1 text-sm text-muted-foreground">record invoice</p>
          </CardContent>
        </Card>
      </section>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-72 flex-1 text-sm font-medium">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari No Invoice, customer, atau PO..."
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </span>
          </label>
          <label className="min-w-56 text-sm font-medium">
            Status
            <select
              value={filter}
              onChange={(event) => setFilter(event.target.value as InvoiceFilter)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            >
              <option value="ALL">Semua</option>
              <option value="ISSUED">Issued</option>
              <option value="PAID">Paid</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Dibuat</CardTitle>
          <CardDescription>Invoice tersimpan sebagai entitas independen.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No Invoice</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">DO</TableHead>
                <TableHead className="text-right">Transaksi</TableHead>
                <TableHead className="text-right">Tonase</TableHead>
                <TableHead className="text-right">Grand Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredInvoices.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="h-24 text-center text-muted-foreground">
                    Belum ada invoice yang sesuai.
                  </TableCell>
                </TableRow>
              ) : (
                filteredInvoices.map((invoice) => {
                  const totals = calculateSalesInvoiceTotals(invoice);
                  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);

                  return (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-semibold">{invoice.invoiceNumber}</TableCell>
                      <TableCell className="min-w-52">{invoice.customerName}</TableCell>
                      <TableCell>{formatDateID(invoice.invoiceDate)}</TableCell>
                      <TableCell className="text-right">{totals.groups.length}</TableCell>
                      <TableCell className="text-right">{invoice.transactionIds.length}</TableCell>
                      <TableCell className="text-right">{formatTonnage(totalTonnage)}</TableCell>
                      <TableCell className="text-right">{formatRupiah(totals.grandTotal)}</TableCell>
                      <TableCell><InvoiceStatusBadge invoice={invoice} /></TableCell>
                      <TableCell className="text-right">
                        <Link href={`/invoices/${invoice.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                          Lihat Invoice
                        </Link>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoiceStatusBadge({ invoice }: { invoice: SalesInvoice }) {
  if (invoice.status === "PAID") {
    return <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700">Paid</Badge>;
  }

  if (invoice.status === "CANCELLED") {
    return <Badge variant="outline" className="text-destructive">Cancelled</Badge>;
  }

  return <Badge variant="outline" className="text-muted-foreground">Issued</Badge>;
}
