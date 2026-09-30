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
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { mockDeliveryOrders } from "@/data/mock-delivery-orders";
import { getDashboardMetrics, getRecentDeliveryOrders } from "@/lib/dashboard";
import { formatRupiah } from "@/lib/format";

export default function DashboardPage() {
  const metrics = getDashboardMetrics(mockDeliveryOrders);
  const recentOrders = getRecentDeliveryOrders(mockDeliveryOrders, 8);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <PageHeader
          title="Dashboard"
          description="Ringkasan operasional dan keuangan berdasarkan seluruh Delivery Order."
        />
        <Badge variant="outline" className="w-fit bg-background text-muted-foreground">
          Data Demo
        </Badge>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <MetricCard
          title="Total DO"
          value={metrics.totalOrders}
          description="Seluruh Delivery Order"
          icon={ClipboardList}
        />
        <MetricCard
          title="Belum Dibayar ke Mitra"
          value={metrics.statusCounts.UNPAID_PARTNER}
          description="Kewajiban pembayaran mitra"
          icon={Truck}
        />
        <MetricCard
          title="Sudah Dibayar, Belum Ditagih"
          value={metrics.statusCounts.PARTNER_PAID_NOT_INVOICED}
          description="Siap dibuatkan invoice"
          icon={FileClock}
        />
        <MetricCard
          title="Menunggu Pembayaran Tambang"
          value={metrics.statusCounts.WAITING_CUSTOMER_PAYMENT}
          description="Invoice belum dibayar"
          icon={ReceiptText}
        />
        <MetricCard
          title="Lengkap"
          value={metrics.statusCounts.COMPLETED}
          description="Transaksi selesai"
          icon={CheckCircle2}
        />
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Outstanding Mitra"
          value={formatRupiah(metrics.outstandingPartnerAmount)}
          description="Belum dibayar ke mitra"
          icon={BanknoteArrowDown}
        />
        <MetricCard
          title="Outstanding Tambang"
          value={formatRupiah(metrics.outstandingCustomerAmount)}
          description="Invoice belum diterima pembayarannya"
          icon={BanknoteArrowUp}
        />
        <MetricCard
          title="Total Penjualan"
          value={formatRupiah(metrics.totalSalesAmount)}
          description="DO yang sudah memiliki invoice"
          icon={FileText}
        />
        <MetricCard
          title="Gross Margin Terealisasi"
          value={formatRupiah(metrics.realizedGrossMargin)}
          description="Margin dari DO yang telah selesai dan dibayar"
          icon={HandCoins}
        />
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
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Piutang Tambang</span>
              <span className="font-medium">
                {formatRupiah(metrics.outstandingCustomerAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4 border-b pb-3">
              <span className="text-muted-foreground">Utang Mitra</span>
              <span className="font-medium">
                {formatRupiah(metrics.outstandingPartnerAmount)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-muted-foreground">Margin Terealisasi</span>
              <span className="font-medium">
                {formatRupiah(metrics.realizedGrossMargin)}
              </span>
            </div>
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
