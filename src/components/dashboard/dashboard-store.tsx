"use client";

import { useMemo } from "react";
import {
  BanknoteArrowDown,
  BanknoteArrowUp,
  CheckCircle2,
  ClipboardList,
  FileClock,
  FileText,
  HandCoins,
  ReceiptText,
  Truck,
} from "lucide-react";

import { DoStatusChart } from "@/components/dashboard/do-status-chart";
import { MetricCard } from "@/components/dashboard/metric-card";
import { RecentDeliveryOrders } from "@/components/dashboard/recent-delivery-orders";
import { PageHeader } from "@/components/page-header";
import { StoreLoading } from "@/components/store-loading";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getDashboardMetrics, getRecentDeliveryOrders } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/format";
import {
  selectDeliveryOrderTransactions,
  selectDeliveryOrders,
  selectHasHydrated,
  selectInvoices,
} from "@/stores/demo-store";
import { useDemoStore } from "@/stores/demo-store-provider";

export function DashboardStore() {
  const hasHydrated = useDemoStore(selectHasHydrated);
  const orders = useDemoStore(selectDeliveryOrders);
  const transactions = useDemoStore(selectDeliveryOrderTransactions);
  const invoices = useDemoStore(selectInvoices);
  const metrics = useMemo(
    () => getDashboardMetrics({ orders, transactions, invoices }),
    [orders, transactions, invoices],
  );
  const recentOrders = useMemo(
    () => getRecentDeliveryOrders({ orders, transactions, invoices, limit: 8 }),
    [orders, transactions, invoices],
  );

  if (!hasHydrated) {
    return <StoreLoading />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description="Ringkasan operasional dan keuangan berdasarkan transaksi, invoice, dan pembayaran."
        />
        <Badge variant="outline" className="w-fit bg-background text-muted-foreground">
          Data Demo
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard title="Total DO" value={metrics.totalOrders} description={`${metrics.totalTransactions} transaksi`} icon={ClipboardList} />
        <MetricCard title="Belum Dibayar ke Mitra" value={metrics.transactionCounts.PARTNER_UNPAID} description="Transaksi belum dibayar" icon={Truck} />
        <MetricCard title="Sudah Dibayar, Belum Ditagih" value={metrics.transactionCounts.ELIGIBLE_UNINVOICED} description="Transaksi siap dibuatkan invoice" icon={FileClock} />
        <MetricCard title="Menunggu Pembayaran Tambang" value={metrics.transactionCounts.INVOICED_UNPAID} description="Transaksi dalam invoice terbit" icon={ReceiptText} />
        <MetricCard title="Lengkap" value={metrics.transactionCounts.COMPLETED} description="Transaksi selesai" icon={CheckCircle2} />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Outstanding Mitra" value={formatRupiah(metrics.outstandingPartnerAmount)} description="Belum dibayar ke mitra" icon={BanknoteArrowDown} />
        <MetricCard title="Outstanding Tambang" value={formatRupiah(metrics.outstandingCustomerAmount)} description="Invoice belum diterima pembayarannya" icon={BanknoteArrowUp} />
        <MetricCard title="Total Penjualan" value={formatRupiah(metrics.totalSalesAmount)} description="DO yang sudah memiliki invoice" icon={FileText} />
        <MetricCard title="Gross Margin Terealisasi" value={formatRupiah(metrics.realizedGrossMargin)} description="Margin dari DO yang telah selesai dan dibayar" icon={HandCoins} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <Card>
          <CardHeader>
            <CardTitle>Distribusi Status DO</CardTitle>
          </CardHeader>
          <CardContent>
            <DoStatusChart statusCounts={metrics.statusCounts} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ringkasan Piutang & Margin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <DashboardLine label="Piutang Tambang" value={formatRupiah(metrics.outstandingCustomerAmount)} />
            <DashboardLine label="Utang Mitra" value={formatRupiah(metrics.outstandingPartnerAmount)} />
            <DashboardLine label="Margin Terealisasi" value={formatRupiah(metrics.realizedGrossMargin)} last />
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>DO Terbaru</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentDeliveryOrders orders={recentOrders} />
        </CardContent>
      </Card>
    </div>
  );
}

function DashboardLine({ label, value, last = false }: { label: string; value: string; last?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 ${last ? "" : "border-b pb-3"}`}>
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
