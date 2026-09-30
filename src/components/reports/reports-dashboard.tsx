"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { StatusBadge } from "@/components/delivery-orders/status-badge";
import { Button } from "@/components/ui/button";
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
import {
  formatTonnage,
  getUniqueCustomers,
  getUniquePartners,
  sortDeliveryOrdersByNewest,
} from "@/lib/delivery-orders";
import { deliveryOrderStatusLabels } from "@/lib/delivery-order-status";
import { formatDateID, formatRupiah } from "@/lib/format";
import {
  exportCsv,
  filterReportOrders,
  hasActiveReportFilters,
  type CsvColumn,
  type ReportFilters,
} from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery-order";

interface ReportsDashboardProps {
  orders: DeliveryOrder[];
}

type ReportTab = "do" | "purchase" | "sales";

const defaultFilters: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  partnerName: "ALL",
  customerName: "ALL",
  status: "ALL",
};

const statusOptions: Array<DeliveryOrderStatus | "ALL"> = [
  "ALL",
  "UNPAID_PARTNER",
  "PARTNER_PAID_NOT_INVOICED",
  "WAITING_CUSTOMER_PAYMENT",
  "COMPLETED",
];

const today = new Date().toISOString().slice(0, 10);

export function ReportsDashboard({ orders }: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("do");
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const partnerOptions = useMemo(() => getUniquePartners(orders), [orders]);
  const customerOptions = useMemo(() => getUniqueCustomers(orders), [orders]);
  const filteredOrders = useMemo(
    () => sortDeliveryOrdersByNewest(filterReportOrders(orders, filters)),
    [orders, filters],
  );
  const purchaseOrders = filteredOrders.filter((order) => order.partnerPaidAt);
  const salesOrders = filteredOrders.filter(
    (order) => order.salesInvoiceNumber && order.customerPaidAt,
  );

  function updateFilter<Key extends keyof ReportFilters>(
    key: Key,
    value: ReportFilters[Key],
  ) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          Laporan
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Lihat dan unduh laporan operasional dan transaksi berdasarkan Delivery Order.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>
            Laporan ini merupakan laporan operasional/transaksi dan belum mencakup laporan akuntansi formal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterInput label="Tanggal Dari" type="date" value={filters.dateFrom} onChange={(value) => updateFilter("dateFrom", value)} />
            <FilterInput label="Tanggal Sampai" type="date" value={filters.dateTo} onChange={(value) => updateFilter("dateTo", value)} />
            <FilterSelect label="Mitra" value={filters.partnerName} onChange={(value) => updateFilter("partnerName", value)} options={[{ value: "ALL", label: "Semua Mitra" }, ...partnerOptions.map((partner) => ({ value: partner, label: partner }))]} />
            <FilterSelect label="Tambang" value={filters.customerName} onChange={(value) => updateFilter("customerName", value)} options={[{ value: "ALL", label: "Semua Tambang" }, ...customerOptions.map((customer) => ({ value: customer, label: customer }))]} />
            <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value as ReportFilters["status"])} options={statusOptions.map((status) => ({ value: status, label: status === "ALL" ? "Semua Status" : deliveryOrderStatusLabels[status] }))} />
            <Button
              type="button"
              variant="outline"
              disabled={!hasActiveReportFilters(filters)}
              onClick={() => setFilters(defaultFilters)}
            >
              Reset Filter
            </Button>
          </div>
          <p className="text-sm text-muted-foreground">
            Menampilkan {getActiveReportCount(activeTab, filteredOrders.length, purchaseOrders.length, salesOrders.length)} data
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2 shadow-sm" role="tablist" aria-label="Jenis laporan">
        <TabButton active={activeTab === "do"} onClick={() => setActiveTab("do")}>Laporan DO</TabButton>
        <TabButton active={activeTab === "purchase"} onClick={() => setActiveTab("purchase")}>Laporan Pembelian</TabButton>
        <TabButton active={activeTab === "sales"} onClick={() => setActiveTab("sales")}>Laporan Penjualan</TabButton>
      </div>

      {activeTab === "do" ? <DeliveryOrderReport orders={filteredOrders} /> : null}
      {activeTab === "purchase" ? <PurchaseReport orders={purchaseOrders} /> : null}
      {activeTab === "sales" ? <SalesReport orders={salesOrders} /> : null}
    </div>
  );
}

function getActiveReportCount(
  activeTab: ReportTab,
  doCount: number,
  purchaseCount: number,
  salesCount: number,
): number {
  if (activeTab === "purchase") {
    return purchaseCount;
  }

  if (activeTab === "sales") {
    return salesCount;
  }

  return doCount;
}

function DeliveryOrderReport({ orders }: { orders: DeliveryOrder[] }) {
  const totalTonnage = orders.reduce((total, order) => total + order.tonnage, 0);

  return (
    <ReportCard
      title="Laporan DO"
      description="Ringkasan operasional Delivery Order."
      onExport={() => exportCsv(`laporan-do-${today}.csv`, orders, doCsvColumns)}
      canExport={orders.length > 0}
      summary={<SummaryGrid items={[{ label: "Jumlah DO", value: orders.length }, { label: "Total Tonase", value: formatTonnage(totalTonnage) }]} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No DO</TableHead>
            <TableHead>Tanggal Muat</TableHead>
            <TableHead>Tanggal Bongkar</TableHead>
            <TableHead>Mitra</TableHead>
            <TableHead>Tambang</TableHead>
            <TableHead>No Polisi</TableHead>
            <TableHead>Pengemudi</TableHead>
            <TableHead>Asal Tambang</TableHead>
            <TableHead>Pelabuhan Tujuan</TableHead>
            <TableHead className="text-right">Tonase</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? <EmptyRow colSpan={11} /> : orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-semibold">{order.doNumber}</TableCell>
              <TableCell>{formatDateID(order.loadingDate)}</TableCell>
              <TableCell>{formatDateID(order.unloadingDate)}</TableCell>
              <TableCell className="min-w-52">{order.partnerName}</TableCell>
              <TableCell className="min-w-52">{order.customerName}</TableCell>
              <TableCell className="font-mono font-semibold">{order.truckPlate}</TableCell>
              <TableCell>{order.driverName}</TableCell>
              <TableCell className="min-w-56">{order.originMine}</TableCell>
              <TableCell className="min-w-56">{order.destinationPort}</TableCell>
              <TableCell className="text-right">{formatTonnage(order.tonnage)}</TableCell>
              <TableCell><StatusBadge status={order.status} /></TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  );
}

function PurchaseReport({ orders }: { orders: DeliveryOrder[] }) {
  const totalPurchase = orders.reduce((total, order) => total + order.purchaseTotal, 0);

  return (
    <ReportCard
      title="Laporan Pembelian"
      description="Transaksi pembelian dan pembayaran ke mitra."
      onExport={() => exportCsv(`laporan-pembelian-${today}.csv`, orders, purchaseCsvColumns)}
      canExport={orders.length > 0}
      summary={<SummaryGrid items={[{ label: "Total Pembelian Dibayar", value: formatRupiah(totalPurchase) }, { label: "Jumlah DO Dibayar", value: orders.length }]} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No DO</TableHead>
            <TableHead>Tanggal Muat</TableHead>
            <TableHead>Mitra</TableHead>
            <TableHead>No Invoice Mitra</TableHead>
            <TableHead className="text-right">Harga Angkut</TableHead>
            <TableHead className="text-right">Uang Jalan</TableHead>
            <TableHead className="text-right">Uang Pijak Gas</TableHead>
            <TableHead className="text-right">PPh 23</TableHead>
            <TableHead className="text-right">Total Pembelian</TableHead>
            <TableHead>Status Pembayaran</TableHead>
            <TableHead>Tanggal Bayar Mitra</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? <EmptyRow colSpan={11} /> : orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-semibold">{order.doNumber}</TableCell>
              <TableCell>{formatDateID(order.loadingDate)}</TableCell>
              <TableCell className="min-w-52">{order.partnerName}</TableCell>
              <TableCell>{order.partnerInvoiceNumber ?? "-"}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.transportPrice)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.roadMoney)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.gasMoney)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.partnerPph23)}</TableCell>
              <TableCell className="text-right font-semibold">{formatRupiah(order.purchaseTotal)}</TableCell>
              <TableCell>{order.partnerPaidAt ? "Sudah Dibayar" : "Belum Dibayar"}</TableCell>
              <TableCell>{formatDateID(order.partnerPaidAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  );
}

function SalesReport({ orders }: { orders: DeliveryOrder[] }) {
  const totalSales = orders.reduce((total, order) => total + order.salesTotal, 0);

  return (
    <ReportCard
      title="Laporan Penjualan"
      description="Invoice penjualan dan status pembayaran tambang."
      onExport={() => exportCsv(`laporan-penjualan-${today}.csv`, orders, salesCsvColumns)}
      canExport={orders.length > 0}
      summary={<SummaryGrid items={[{ label: "Total Penjualan Dibayar", value: formatRupiah(totalSales) }, { label: "Jumlah Invoice Dibayar", value: orders.length }]} />}
    >
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No DO</TableHead>
            <TableHead>Tambang</TableHead>
            <TableHead>No Invoice Penjualan</TableHead>
            <TableHead>Tanggal Invoice</TableHead>
            <TableHead className="text-right">Nilai Penjualan</TableHead>
            <TableHead className="text-right">Uang Pijak Gas</TableHead>
            <TableHead className="text-right">PPh 23</TableHead>
            <TableHead className="text-right">Total Penjualan</TableHead>
            <TableHead>Status Pembayaran</TableHead>
            <TableHead>Tanggal Pembayaran</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.length === 0 ? <EmptyRow colSpan={10} /> : orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell className="font-semibold">{order.doNumber}</TableCell>
              <TableCell className="min-w-52">{order.customerName}</TableCell>
              <TableCell>{order.salesInvoiceNumber}</TableCell>
              <TableCell>{formatDateID(order.salesInvoiceDate)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.sellingPrice)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.salesGasMoney)}</TableCell>
              <TableCell className="text-right">{formatRupiah(order.salesPph23)}</TableCell>
              <TableCell className="text-right font-semibold">{formatRupiah(order.salesTotal)}</TableCell>
              <TableCell>{order.customerPaidAt ? "Sudah Dibayar" : "Menunggu Pembayaran"}</TableCell>
              <TableCell>{formatDateID(order.customerPaidAt)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </ReportCard>
  );
}

function ReportCard({
  title,
  description,
  canExport,
  onExport,
  summary,
  children,
}: {
  title: string;
  description: string;
  canExport: boolean;
  onExport: () => void;
  summary: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between">
        <div>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <Button type="button" disabled={!canExport} onClick={onExport} className="w-fit">
          <Download />
          Export CSV
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary}
        {children}
      </CardContent>
    </Card>
  );
}

function SummaryGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-lg border bg-muted/30 p-3">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-lg font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="h-28 text-center text-muted-foreground">
        Tidak ada data yang sesuai dengan filter.
      </TableCell>
    </TableRow>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "rounded-md px-4 py-2 text-sm font-medium transition-colors",
        active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function FilterInput({ label, type, value, onChange }: { label: string; type: "date"; value: string; onChange: (value: string) => void }) {
  return (
    <label className="min-w-40 text-sm font-medium">
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

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return (
    <label className="min-w-52 text-sm font-medium">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>{option.label}</option>
        ))}
      </select>
    </label>
  );
}

const doCsvColumns: Array<CsvColumn<DeliveryOrder>> = [
  { header: "No DO", value: (order) => order.doNumber },
  { header: "Tanggal Muat", value: (order) => order.loadingDate },
  { header: "Tanggal Bongkar", value: (order) => order.unloadingDate },
  { header: "Mitra", value: (order) => order.partnerName },
  { header: "Tambang", value: (order) => order.customerName },
  { header: "No Polisi", value: (order) => order.truckPlate },
  { header: "Pengemudi", value: (order) => order.driverName },
  { header: "Asal Tambang", value: (order) => order.originMine },
  { header: "Pelabuhan Tujuan", value: (order) => order.destinationPort },
  { header: "Tonase", value: (order) => order.tonnage },
  { header: "Status", value: (order) => deliveryOrderStatusLabels[order.status] },
];

const purchaseCsvColumns: Array<CsvColumn<DeliveryOrder>> = [
  { header: "No DO", value: (order) => order.doNumber },
  { header: "Tanggal Muat", value: (order) => order.loadingDate },
  { header: "Mitra", value: (order) => order.partnerName },
  { header: "No Invoice Mitra", value: (order) => order.partnerInvoiceNumber },
  { header: "Harga Angkut", value: (order) => order.transportPrice },
  { header: "Uang Jalan", value: (order) => order.roadMoney },
  { header: "Uang Pijak Gas", value: (order) => order.gasMoney },
  { header: "PPh 23", value: (order) => order.partnerPph23 },
  { header: "Total Pembelian", value: (order) => order.purchaseTotal },
  { header: "Status Pembayaran", value: (order) => order.partnerPaidAt ? "Sudah Dibayar" : "Belum Dibayar" },
  { header: "Tanggal Bayar Mitra", value: (order) => order.partnerPaidAt },
];

const salesCsvColumns: Array<CsvColumn<DeliveryOrder>> = [
  { header: "No DO", value: (order) => order.doNumber },
  { header: "Tambang", value: (order) => order.customerName },
  { header: "No Invoice Penjualan", value: (order) => order.salesInvoiceNumber },
  { header: "Tanggal Invoice", value: (order) => order.salesInvoiceDate },
  { header: "Nilai Penjualan", value: (order) => order.sellingPrice },
  { header: "Uang Pijak Gas", value: (order) => order.salesGasMoney },
  { header: "PPh 23", value: (order) => order.salesPph23 },
  { header: "Total Penjualan", value: (order) => order.salesTotal },
  { header: "Status Pembayaran", value: (order) => order.customerPaidAt ? "Sudah Dibayar" : "Menunggu Pembayaran" },
  { header: "Tanggal Pembayaran", value: (order) => order.customerPaidAt },
];
