"use client";

import Link from "next/link";
import { ArrowRight, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";

import { ProgressStatusBadge } from "@/components/delivery-orders/status-badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deliveryOrderProgressLabels } from "@/lib/delivery-order-status";
import {
  filterDeliveryOrders,
  formatTonnage,
  getUniqueCustomers,
  getUniquePartners,
  hasActiveDeliveryOrderFilters,
  sortDeliveryOrdersByNewest,
  type DeliveryOrderFilters,
} from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import { deriveParentDeliveryOrderProgress, getParentTransactions, type ParentDeliveryOrderProgressStatus } from "@/lib/lifecycle";
import { calculatePartnerTransactionCost } from "@/lib/partner-recap";
import { cn } from "@/lib/utils";
import type { DeliveryOrder, DeliveryOrderTransaction, SalesInvoice } from "@/types/delivery-order";

interface DeliveryOrderTrackerProps {
  orders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}

const defaultFilters: DeliveryOrderFilters = {
  search: "",
  status: "ALL",
  partnerName: "ALL",
  customerName: "ALL",
  loadingDateFrom: "",
  loadingDateTo: "",
};

const statusOptions: Array<ParentDeliveryOrderProgressStatus | "ALL"> = [
  "ALL",
  "PARTNER_UNPAID",
  "ELIGIBLE_UNINVOICED",
  "INVOICED_UNPAID",
  "COMPLETED",
  "MIXED",
];

export function DeliveryOrderTracker({ orders, transactions, invoices }: DeliveryOrderTrackerProps) {
  const [filters, setFilters] = useState<DeliveryOrderFilters>(defaultFilters);

  const partnerOptions = useMemo(() => getUniquePartners(orders), [orders]);
  const customerOptions = useMemo(() => getUniqueCustomers(orders), [orders]);
  const filteredOrders = useMemo(() => {
    const baseFiltered = filterDeliveryOrders(orders, { ...filters, status: "ALL" });

    return sortDeliveryOrdersByNewest(
      filters.status === "ALL"
        ? baseFiltered
        : baseFiltered.filter((order) => {
            const progress = deriveParentDeliveryOrderProgress(
              getParentTransactions(order, transactions),
              invoices,
            );

            return progress.status === filters.status;
          }),
    );
  }, [orders, filters, transactions, invoices]);
  const orderSummaries = useMemo(
    () =>
      new Map(
        filteredOrders.map((order) => {
          const orderTransactions = getParentTransactions(order, transactions);
          const progress = deriveParentDeliveryOrderProgress(orderTransactions, invoices);
          const invoiceIds = new Set(orderTransactions.map((transaction) => transaction.salesInvoiceId).filter(Boolean));
          const salesTotal = invoices
            .filter((invoice) => invoiceIds.has(invoice.id) && invoice.status !== "CANCELLED")
            .reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);
          const purchaseTotal = orderTransactions.reduce(
            (total, transaction) => total + calculatePartnerTransactionCost(transaction).totalPayment,
            0,
          );

          return [order.id, { progress, purchaseTotal, salesTotal }] as const;
        }),
      ),
    [filteredOrders, transactions, invoices],
  );
  const isFilterActive = hasActiveDeliveryOrderFilters(filters);
  const summary = useMemo(
    () =>
      filteredOrders.reduce(
        (totals, order) => ({
          tonnage: totals.tonnage + (orderSummaries.get(order.id)?.progress.totalTonnage ?? 0),
          purchaseTotal: totals.purchaseTotal + (orderSummaries.get(order.id)?.purchaseTotal ?? 0),
          salesTotal: totals.salesTotal + (orderSummaries.get(order.id)?.salesTotal ?? 0),
        }),
        { tonnage: 0, purchaseTotal: 0, salesTotal: 0 },
      ),
    [filteredOrders, orderSummaries],
  );

  function updateFilter<Key extends keyof DeliveryOrderFilters>(
    key: Key,
    value: DeliveryOrderFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function resetFilters() {
    setFilters(defaultFilters);
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight text-foreground">
            Tracking DO
          </h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
            Pantau seluruh Delivery Order dan status transaksi operasional.
          </p>
        </div>
        <Link href="/delivery-orders/new" className={cn(buttonVariants(), "w-fit")}>
          <Plus />
          Buat DO
        </Link>
      </div>

      <section className="rounded-lg border bg-card p-4 shadow-sm">
        <div className="flex flex-wrap items-end gap-3">
          <label className="min-w-64 flex-1 text-sm font-medium">
            Search
            <span className="relative mt-2 block">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={filters.search}
                onChange={(event) => updateFilter("search", event.target.value)}
                placeholder="Cari No DO, no polisi, pengemudi..."
                className="h-9 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-3 focus:ring-ring/30"
              />
            </span>
          </label>

          <label className="min-w-56 text-sm font-medium">
            Status
            <select
              value={filters.status}
              onChange={(event) =>
                updateFilter(
                  "status",
                  event.target.value as DeliveryOrderFilters["status"],
                )
              }
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            >
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status === "ALL" ? "Semua Status" : deliveryOrderProgressLabels[status]}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-56 text-sm font-medium">
            Mitra
            <select
              value={filters.partnerName}
              onChange={(event) => updateFilter("partnerName", event.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            >
              <option value="ALL">Semua Mitra</option>
              {partnerOptions.map((partnerName) => (
                <option key={partnerName} value={partnerName}>
                  {partnerName}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-56 text-sm font-medium">
            Tambang
            <select
              value={filters.customerName}
              onChange={(event) => updateFilter("customerName", event.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            >
              <option value="ALL">Semua Tambang</option>
              {customerOptions.map((customerName) => (
                <option key={customerName} value={customerName}>
                  {customerName}
                </option>
              ))}
            </select>
          </label>

          <label className="min-w-40 text-sm font-medium">
            Tanggal Muat Dari
            <input
              type="date"
              value={filters.loadingDateFrom}
              onChange={(event) =>
                updateFilter("loadingDateFrom", event.target.value)
              }
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
          </label>

          <label className="min-w-40 text-sm font-medium">
            Tanggal Muat Sampai
            <input
              type="date"
              value={filters.loadingDateTo}
              onChange={(event) => updateFilter("loadingDateTo", event.target.value)}
              className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
            />
          </label>

          <Button
            type="button"
            variant="outline"
            disabled={!isFilterActive}
            onClick={resetFilters}
          >
            Reset Filter
          </Button>
        </div>
      </section>

      <section className="rounded-lg border bg-card shadow-sm">
        <div className="flex flex-col gap-2 border-b p-4 text-sm text-muted-foreground lg:flex-row lg:items-center lg:justify-between">
          <p>
            Menampilkan {filteredOrders.length} dari {orders.length} DO
          </p>
          <p>
            {filteredOrders.length} DO • {formatTonnage(summary.tonnage)} • Pembelian {" "}
            {formatRupiah(summary.purchaseTotal)} • Penjualan {" "}
            {formatRupiah(summary.salesTotal)}
          </p>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>No DO</TableHead>
              <TableHead>Tanggal Muat</TableHead>
              <TableHead>Mitra</TableHead>
              <TableHead>Tambang</TableHead>
              <TableHead>Transaksi</TableHead>
              <TableHead className="text-right">Tonase</TableHead>
              <TableHead className="text-right">Total Pembelian</TableHead>
              <TableHead className="text-right">Total Penjualan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredOrders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className="h-32 text-center">
                  <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                    <p>Tidak ada Delivery Order yang sesuai dengan filter.</p>
                    {isFilterActive ? (
                      <Button type="button" variant="outline" onClick={resetFilters}>
                        Reset Filter
                      </Button>
                    ) : null}
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-semibold">
                    <Link
                      href={`/delivery-orders/${order.id}`}
                      className="text-foreground underline-offset-4 hover:underline"
                    >
                      {order.doNumber}
                    </Link>
                  </TableCell>
                  <TableCell>{formatDateID(order.loadingDate)}</TableCell>
                  <TableCell className="min-w-52">{order.partnerName}</TableCell>
                  <TableCell className="min-w-52">{order.customerName}</TableCell>
                  <TableCell className="font-mono font-semibold">
                    {orderSummaries.get(order.id)?.progress.transactionCount ?? 0} baris
                  </TableCell>
                  <TableCell className="text-right">
                    {formatTonnage(orderSummaries.get(order.id)?.progress.totalTonnage ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatRupiah(orderSummaries.get(order.id)?.purchaseTotal ?? 0)}
                  </TableCell>
                  <TableCell className="text-right">
                    {(orderSummaries.get(order.id)?.salesTotal ?? 0) > 0
                      ? formatRupiah(orderSummaries.get(order.id)?.salesTotal ?? 0)
                      : "-"}
                  </TableCell>
                  <TableCell>
                    <ProgressStatusBadge status={orderSummaries.get(order.id)?.progress.status ?? "PARTNER_UNPAID"} />
                  </TableCell>
                  <TableCell className="text-right">
                    <Link
                      href={`/delivery-orders/${order.id}`}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
                    >
                      Lihat
                      <ArrowRight />
                    </Link>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </section>
    </div>
  );
}
