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
import { getInvoicePaymentStatus } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import type { DeliveryOrder } from "@/types/delivery-order";

interface InvoiceListProps {
  orders: DeliveryOrder[];
}

type InvoiceFilter = "ALL" | "READY" | "WAITING" | "PAID";

export function InvoiceList({ orders }: InvoiceListProps) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<InvoiceFilter>("ALL");

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase("id-ID");

    return orders.filter((order) => {
      const matchesSearch =
        query === "" ||
        [order.salesInvoiceNumber, order.doNumber, order.customerName].some((value) =>
          value?.toLocaleLowerCase("id-ID").includes(query),
        );
      const matchesFilter =
        filter === "ALL" ||
        (filter === "READY" && order.status === "PARTNER_PAID_NOT_INVOICED") ||
        (filter === "WAITING" && order.status === "WAITING_CUSTOMER_PAYMENT") ||
        (filter === "PAID" && order.status === "COMPLETED");

      return matchesSearch && matchesFilter;
    });
  }, [orders, search, filter]);

  const readyOrders = filteredOrders.filter(
    (order) => order.status === "PARTNER_PAID_NOT_INVOICED",
  );
  const invoicedOrders = filteredOrders.filter(
    (order) =>
      order.status === "WAITING_CUSTOMER_PAYMENT" || order.status === "COMPLETED",
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Invoice
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Kelola invoice penjualan yang dibuat berdasarkan Delivery Order.
        </p>
      </div>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-72 flex-1 text-sm font-medium">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Cari No Invoice, No DO, atau Tambang..."
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
              <option value="READY">Siap Ditagih</option>
              <option value="WAITING">Menunggu Pembayaran</option>
              <option value="PAID">Sudah Dibayar</option>
            </select>
          </label>
        </div>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>DO Siap Ditagih</CardTitle>
          <CardDescription>
            Delivery Order yang mitranya sudah dibayar dan siap dibuatkan invoice.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No DO</TableHead>
                <TableHead>Tambang</TableHead>
                <TableHead>Mitra</TableHead>
                <TableHead>Tanggal Muat</TableHead>
                <TableHead className="text-right">Tonase</TableHead>
                <TableHead className="text-right">Total Pembelian</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {readyOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Tidak ada DO yang siap ditagih.
                  </TableCell>
                </TableRow>
              ) : (
                readyOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">{order.doNumber}</TableCell>
                    <TableCell className="min-w-52">{order.customerName}</TableCell>
                    <TableCell className="min-w-52">{order.partnerName}</TableCell>
                    <TableCell>{formatDateID(order.loadingDate)}</TableCell>
                    <TableCell className="text-right">{formatTonnage(order.tonnage)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(order.purchaseTotal)}</TableCell>
                    <TableCell className="text-right">
                      <Link href={`/invoices/${order.id}`} className={cn(buttonVariants({ size: "sm" }))}>
                        <FilePlus2 />
                        Buat Invoice
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Invoice Dibuat</CardTitle>
          <CardDescription>Invoice yang sedang menunggu pembayaran atau sudah dibayar.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No Invoice</TableHead>
                <TableHead>No DO</TableHead>
                <TableHead>Tambang</TableHead>
                <TableHead>Tanggal Invoice</TableHead>
                <TableHead className="text-right">Total Invoice</TableHead>
                <TableHead>Status Pembayaran</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicedOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    Belum ada invoice yang sesuai dengan pencarian.
                  </TableCell>
                </TableRow>
              ) : (
                invoicedOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-semibold">{order.salesInvoiceNumber ?? "-"}</TableCell>
                    <TableCell>{order.doNumber}</TableCell>
                    <TableCell className="min-w-52">{order.customerName}</TableCell>
                    <TableCell>{formatDateID(order.salesInvoiceDate)}</TableCell>
                    <TableCell className="text-right">{formatRupiah(order.salesTotal)}</TableCell>
                    <TableCell><InvoicePaymentBadge order={order} /></TableCell>
                    <TableCell className="text-right">
                      <Link href={`/invoices/${order.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
                        Lihat Invoice
                      </Link>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function InvoicePaymentBadge({ order }: { order: DeliveryOrder }) {
  return order.customerPaidAt ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      {getInvoicePaymentStatus(order)}
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {getInvoicePaymentStatus(order)}
    </Badge>
  );
}
