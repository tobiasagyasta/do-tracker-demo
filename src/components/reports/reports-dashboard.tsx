"use client";

import { Download } from "lucide-react";
import { useMemo, useState } from "react";

import { ProgressStatusBadge } from "@/components/delivery-orders/status-badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { deliveryOrderProgressLabels } from "@/lib/delivery-order-status";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import { deriveParentDeliveryOrderProgress, getParentTransactions, type ParentDeliveryOrderProgress, type ParentDeliveryOrderProgressStatus } from "@/lib/lifecycle";
import { calculatePartnerTransactionCost } from "@/lib/partner-recap";
import { exportCsv, hasActiveReportFilters, type CsvColumn, type ReportFilters } from "@/lib/reports";
import { cn } from "@/lib/utils";
import type { DeliveryOrder, DeliveryOrderTransaction, SalesInvoice } from "@/types/delivery-order";

interface ReportsDashboardProps {
  orders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}

interface ParentReportRow {
  order: DeliveryOrder;
  progress: ParentDeliveryOrderProgress;
  purchaseTotal: number;
  salesTotal: number;
}

interface TransactionReportRow {
  order: DeliveryOrder;
  transaction: DeliveryOrderTransaction;
  invoice?: SalesInvoice;
}

type ReportTab = "parent" | "transactions" | "partner" | "invoices";

const defaultFilters: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  partnerName: "ALL",
  customerName: "ALL",
  status: "ALL",
};

const statusOptions: Array<ParentDeliveryOrderProgressStatus | "ALL"> = [
  "ALL",
  "PARTNER_UNPAID",
  "ELIGIBLE_UNINVOICED",
  "INVOICED_UNPAID",
  "COMPLETED",
  "MIXED",
];

const today = new Date().toISOString().slice(0, 10);

export function ReportsDashboard({ orders, transactions, invoices }: ReportsDashboardProps) {
  const [activeTab, setActiveTab] = useState<ReportTab>("parent");
  const [filters, setFilters] = useState<ReportFilters>(defaultFilters);
  const partnerOptions = useMemo(() => [...new Set(orders.map((order) => order.partnerName))].sort(), [orders]);
  const customerOptions = useMemo(() => [...new Set(orders.map((order) => order.customerName))].sort(), [orders]);

  const parentRows = useMemo(() => buildParentRows({ orders, transactions, invoices, filters }), [orders, transactions, invoices, filters]);
  const transactionRows = useMemo(() => buildTransactionRows({ orders, transactions, invoices, filters }), [orders, transactions, invoices, filters]);
  const partnerRows = transactionRows;
  const invoiceRows = useMemo(() => invoices.filter((invoice) => invoice.status !== "CANCELLED"), [invoices]);

  function updateFilter<Key extends keyof ReportFilters>(key: Key, value: ReportFilters[Key]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Laporan</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Laporan berbasis DO induk, transaksi, pembayaran mitra, dan invoice penjualan.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filter Laporan</CardTitle>
          <CardDescription>Filter tanggal memakai tanggal muat DO induk untuk laporan DO/transaksi.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-end gap-3">
            <FilterInput label="Tanggal Dari" value={filters.dateFrom} onChange={(value) => updateFilter("dateFrom", value)} />
            <FilterInput label="Tanggal Sampai" value={filters.dateTo} onChange={(value) => updateFilter("dateTo", value)} />
            <FilterSelect label="Mitra" value={filters.partnerName} onChange={(value) => updateFilter("partnerName", value)} options={[{ value: "ALL", label: "Semua Mitra" }, ...partnerOptions.map((partner) => ({ value: partner, label: partner }))]} />
            <FilterSelect label="Tambang" value={filters.customerName} onChange={(value) => updateFilter("customerName", value)} options={[{ value: "ALL", label: "Semua Tambang" }, ...customerOptions.map((customer) => ({ value: customer, label: customer }))]} />
            <FilterSelect label="Status" value={filters.status} onChange={(value) => updateFilter("status", value as ReportFilters["status"])} options={statusOptions.map((status) => ({ value: status, label: status === "ALL" ? "Semua Status" : deliveryOrderProgressLabels[status] }))} />
            <Button type="button" variant="outline" disabled={!hasActiveReportFilters(filters)} onClick={() => setFilters(defaultFilters)}>
              Reset Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-wrap gap-2 rounded-lg border bg-card p-2 shadow-sm" role="tablist" aria-label="Jenis laporan">
        <TabButton active={activeTab === "parent"} onClick={() => setActiveTab("parent")}>Ringkasan DO</TabButton>
        <TabButton active={activeTab === "transactions"} onClick={() => setActiveTab("transactions")}>Detail Transaksi</TabButton>
        <TabButton active={activeTab === "partner"} onClick={() => setActiveTab("partner")}>Pembayaran Mitra</TabButton>
        <TabButton active={activeTab === "invoices"} onClick={() => setActiveTab("invoices")}>Invoice Penjualan</TabButton>
      </div>

      {activeTab === "parent" ? <ParentReport rows={parentRows} /> : null}
      {activeTab === "transactions" ? <TransactionReport rows={transactionRows} /> : null}
      {activeTab === "partner" ? <PartnerReport rows={partnerRows} /> : null}
      {activeTab === "invoices" ? <InvoiceReport invoices={invoiceRows} /> : null}
    </div>
  );
}

function buildParentRows(input: ReportsDashboardProps & { filters: ReportFilters }): ParentReportRow[] {
  return input.orders
    .map((order) => {
      const orderTransactions = getParentTransactions(order, input.transactions);
      const progress = deriveParentDeliveryOrderProgress(orderTransactions, input.invoices);
      const invoiceIds = new Set(orderTransactions.map((transaction) => transaction.salesInvoiceId).filter(Boolean));
      const salesTotal = input.invoices.filter((invoice) => invoiceIds.has(invoice.id) && invoice.status !== "CANCELLED").reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);
      const purchaseTotal = orderTransactions.reduce((total, transaction) => total + calculatePartnerTransactionCost(transaction).totalPayment, 0);

      return { order, progress, purchaseTotal, salesTotal };
    })
    .filter((row) => matchesOrderFilters(row.order, row.progress.status, input.filters))
    .sort((a, b) => b.order.loadingDate.localeCompare(a.order.loadingDate));
}

function buildTransactionRows(input: ReportsDashboardProps & { filters: ReportFilters }): TransactionReportRow[] {
  const ordersById = new Map(input.orders.map((order) => [order.id, order]));

  return input.transactions
    .flatMap((transaction) => {
      const order = ordersById.get(transaction.deliveryOrderId);
      if (!order) return [];

      const progress = deriveParentDeliveryOrderProgress(getParentTransactions(order, input.transactions), input.invoices);
      if (!matchesOrderFilters(order, progress.status, input.filters)) return [];

      return [{ order, transaction, invoice: input.invoices.find((invoice) => invoice.id === transaction.salesInvoiceId) }];
    })
    .sort((a, b) => b.order.loadingDate.localeCompare(a.order.loadingDate));
}

function matchesOrderFilters(order: DeliveryOrder, status: ParentDeliveryOrderProgressStatus, filters: ReportFilters): boolean {
  return (filters.dateFrom === "" || order.loadingDate >= filters.dateFrom) &&
    (filters.dateTo === "" || order.loadingDate <= filters.dateTo) &&
    (filters.partnerName === "ALL" || order.partnerName === filters.partnerName) &&
    (filters.customerName === "ALL" || order.customerName === filters.customerName) &&
    (filters.status === "ALL" || filters.status === status);
}

function ParentReport({ rows }: { rows: ParentReportRow[] }) {
  const tonnage = rows.reduce((total, row) => total + row.progress.totalTonnage, 0);

  return (
    <ReportCard title="Ringkasan DO" description="Satu baris per DO induk." onExport={() => exportCsv(`laporan-do-${today}.csv`, rows, parentCsvColumns)} canExport={rows.length > 0} summary={<SummaryGrid items={[{ label: "Jumlah DO", value: rows.length }, { label: "Total Tonase", value: formatTonnage(tonnage) }]} />}>
      <Table><TableHeader><TableRow><TableHead>No DO</TableHead><TableHead>Tanggal Muat</TableHead><TableHead>Mitra</TableHead><TableHead>Tambang</TableHead><TableHead className="text-right">Transaksi</TableHead><TableHead className="text-right">Tonase</TableHead><TableHead className="text-right">Pembelian</TableHead><TableHead className="text-right">Penjualan</TableHead><TableHead>Status</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <EmptyRow colSpan={9} /> : rows.map((row) => <TableRow key={row.order.id}><TableCell className="font-semibold">{row.order.doNumber}</TableCell><TableCell>{formatDateID(row.order.loadingDate)}</TableCell><TableCell className="min-w-52">{row.order.partnerName}</TableCell><TableCell className="min-w-52">{row.order.customerName}</TableCell><TableCell className="text-right">{row.progress.transactionCount}</TableCell><TableCell className="text-right">{formatTonnage(row.progress.totalTonnage)}</TableCell><TableCell className="text-right">{formatRupiah(row.purchaseTotal)}</TableCell><TableCell className="text-right">{row.salesTotal > 0 ? formatRupiah(row.salesTotal) : "-"}</TableCell><TableCell><ProgressStatusBadge status={row.progress.status} /></TableCell></TableRow>)}</TableBody></Table>
    </ReportCard>
  );
}

function TransactionReport({ rows }: { rows: TransactionReportRow[] }) {
  return (
    <ReportCard title="Detail Transaksi" description="Satu baris per transaksi angkutan." onExport={() => exportCsv(`laporan-transaksi-${today}.csv`, rows, transactionCsvColumns)} canExport={rows.length > 0} summary={<SummaryGrid items={[{ label: "Jumlah Transaksi", value: rows.length }, { label: "Total Tonase", value: formatTonnage(rows.reduce((total, row) => total + row.transaction.tonnage, 0)) }]} />}>
      <Table><TableHeader><TableRow><TableHead>No DO</TableHead><TableHead>No Polisi</TableHead><TableHead>Pengemudi</TableHead><TableHead>Asal</TableHead><TableHead>Tujuan</TableHead><TableHead className="text-right">Tonase</TableHead><TableHead>Invoice Penjualan</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <EmptyRow colSpan={7} /> : rows.map((row) => <TableRow key={row.transaction.id}><TableCell className="font-semibold">{row.order.doNumber}</TableCell><TableCell className="font-mono font-semibold">{row.transaction.truckPlate}</TableCell><TableCell>{row.transaction.driverName}</TableCell><TableCell className="min-w-52">{row.transaction.loadingLocation}</TableCell><TableCell className="min-w-52">{row.transaction.unloadingLocation}</TableCell><TableCell className="text-right">{formatTonnage(row.transaction.tonnage)}</TableCell><TableCell>{row.invoice?.invoiceNumber ?? "-"}</TableCell></TableRow>)}</TableBody></Table>
    </ReportCard>
  );
}

function PartnerReport({ rows }: { rows: TransactionReportRow[] }) {
  const total = rows.reduce((sum, row) => sum + calculatePartnerTransactionCost(row.transaction).totalPayment, 0);

  return (
    <ReportCard title="Pembayaran Mitra" description="Pembelian dan status pembayaran per transaksi." onExport={() => exportCsv(`laporan-pembayaran-mitra-${today}.csv`, rows, partnerCsvColumns)} canExport={rows.length > 0} summary={<SummaryGrid items={[{ label: "Total Pembelian", value: formatRupiah(total) }, { label: "Transaksi Dibayar", value: rows.filter((row) => row.transaction.partnerPaymentStatus === "PAID").length }]} />}>
      <Table><TableHeader><TableRow><TableHead>No DO</TableHead><TableHead>Mitra</TableHead><TableHead>No Invoice Mitra</TableHead><TableHead className="text-right">Total Pembelian</TableHead><TableHead>Status</TableHead><TableHead>Tanggal Bayar</TableHead></TableRow></TableHeader><TableBody>{rows.length === 0 ? <EmptyRow colSpan={6} /> : rows.map((row) => <TableRow key={row.transaction.id}><TableCell className="font-semibold">{row.order.doNumber}</TableCell><TableCell className="min-w-52">{row.order.partnerName}</TableCell><TableCell>{row.transaction.partnerInvoiceNumber ?? "-"}</TableCell><TableCell className="text-right font-semibold">{formatRupiah(calculatePartnerTransactionCost(row.transaction).totalPayment)}</TableCell><TableCell>{row.transaction.partnerPaymentStatus === "PAID" ? "Sudah Dibayar" : "Belum Dibayar"}</TableCell><TableCell>{formatDateID(row.transaction.partnerPaidAt)}</TableCell></TableRow>)}</TableBody></Table>
    </ReportCard>
  );
}

function InvoiceReport({ invoices }: { invoices: SalesInvoice[] }) {
  const total = invoices.reduce((sum, invoice) => sum + calculateSalesInvoiceTotals(invoice).grandTotal, 0);

  return (
    <ReportCard title="Invoice Penjualan" description="Invoice penjualan independen dari pembayaran mitra." onExport={() => exportCsv(`laporan-invoice-penjualan-${today}.csv`, invoices, invoiceCsvColumns)} canExport={invoices.length > 0} summary={<SummaryGrid items={[{ label: "Jumlah Invoice", value: invoices.length }, { label: "Total Penjualan", value: formatRupiah(total) }]} />}>
      <Table><TableHeader><TableRow><TableHead>No Invoice</TableHead><TableHead>Tanggal</TableHead><TableHead>Tambang</TableHead><TableHead className="text-right">Transaksi</TableHead><TableHead className="text-right">Total</TableHead><TableHead>Status</TableHead><TableHead>Tanggal Bayar</TableHead></TableRow></TableHeader><TableBody>{invoices.length === 0 ? <EmptyRow colSpan={7} /> : invoices.map((invoice) => <TableRow key={invoice.id}><TableCell className="font-semibold">{invoice.invoiceNumber}</TableCell><TableCell>{formatDateID(invoice.invoiceDate)}</TableCell><TableCell className="min-w-52">{invoice.customerBillingDetails.name}</TableCell><TableCell className="text-right">{invoice.transactionIds.length}</TableCell><TableCell className="text-right font-semibold">{formatRupiah(calculateSalesInvoiceTotals(invoice).grandTotal)}</TableCell><TableCell>{invoice.status === "PAID" ? "Sudah Dibayar" : "Terbit"}</TableCell><TableCell>{formatDateID(invoice.paymentDate)}</TableCell></TableRow>)}</TableBody></Table>
    </ReportCard>
  );
}

function ReportCard({ title, description, canExport, onExport, summary, children }: { title: string; description: string; canExport: boolean; onExport: () => void; summary: React.ReactNode; children: React.ReactNode }) {
  return <Card><CardHeader className="gap-4 md:flex md:flex-row md:items-start md:justify-between"><div><CardTitle>{title}</CardTitle><CardDescription>{description}</CardDescription></div><Button type="button" disabled={!canExport} onClick={onExport} className="w-fit"><Download />Export CSV</Button></CardHeader><CardContent className="space-y-4">{summary}{children}</CardContent></Card>;
}

function SummaryGrid({ items }: { items: Array<{ label: string; value: string | number }> }) {
  return <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{items.map((item) => <div key={item.label} className="rounded-lg border bg-muted/30 p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 text-lg font-semibold">{item.value}</p></div>)}</div>;
}

function EmptyRow({ colSpan }: { colSpan: number }) {
  return <TableRow><TableCell colSpan={colSpan} className="h-28 text-center text-muted-foreground">Tidak ada data yang sesuai dengan filter.</TableCell></TableRow>;
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" role="tab" aria-selected={active} onClick={onClick} className={cn("rounded-md px-4 py-2 text-sm font-medium transition-colors", active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>{children}</button>;
}

function FilterInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return <label className="min-w-40 text-sm font-medium">{label}<input type="date" value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" /></label>;
}

function FilterSelect({ label, value, options, onChange }: { label: string; value: string; options: Array<{ value: string; label: string }>; onChange: (value: string) => void }) {
  return <label className="min-w-52 text-sm font-medium">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30">{options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>;
}

const parentCsvColumns: Array<CsvColumn<ParentReportRow>> = [
  { header: "No DO", value: (row) => row.order.doNumber },
  { header: "Tanggal Muat", value: (row) => row.order.loadingDate },
  { header: "Mitra", value: (row) => row.order.partnerName },
  { header: "Tambang", value: (row) => row.order.customerName },
  { header: "Jumlah Transaksi", value: (row) => row.progress.transactionCount },
  { header: "Tonase", value: (row) => row.progress.totalTonnage },
  { header: "Pembelian", value: (row) => row.purchaseTotal },
  { header: "Penjualan", value: (row) => row.salesTotal },
  { header: "Status", value: (row) => deliveryOrderProgressLabels[row.progress.status] },
];

const transactionCsvColumns: Array<CsvColumn<TransactionReportRow>> = [
  { header: "No DO", value: (row) => row.order.doNumber },
  { header: "No Polisi", value: (row) => row.transaction.truckPlate },
  { header: "Pengemudi", value: (row) => row.transaction.driverName },
  { header: "Asal", value: (row) => row.transaction.loadingLocation },
  { header: "Tujuan", value: (row) => row.transaction.unloadingLocation },
  { header: "Tonase", value: (row) => row.transaction.tonnage },
  { header: "Invoice Penjualan", value: (row) => row.invoice?.invoiceNumber },
];

const partnerCsvColumns: Array<CsvColumn<TransactionReportRow>> = [
  { header: "No DO", value: (row) => row.order.doNumber },
  { header: "Mitra", value: (row) => row.order.partnerName },
  { header: "No Invoice Mitra", value: (row) => row.transaction.partnerInvoiceNumber },
  { header: "Total Pembelian", value: (row) => calculatePartnerTransactionCost(row.transaction).totalPayment },
  { header: "Status", value: (row) => row.transaction.partnerPaymentStatus === "PAID" ? "Sudah Dibayar" : "Belum Dibayar" },
  { header: "Tanggal Bayar", value: (row) => row.transaction.partnerPaidAt },
];

const invoiceCsvColumns: Array<CsvColumn<SalesInvoice>> = [
  { header: "No Invoice", value: (invoice) => invoice.invoiceNumber },
  { header: "Tanggal", value: (invoice) => invoice.invoiceDate },
  { header: "Tambang", value: (invoice) => invoice.customerBillingDetails.name },
  { header: "Jumlah Transaksi", value: (invoice) => invoice.transactionIds.length },
  { header: "Total", value: (invoice) => calculateSalesInvoiceTotals(invoice).grandTotal },
  { header: "Status", value: (invoice) => invoice.status === "PAID" ? "Sudah Dibayar" : "Terbit" },
  { header: "Tanggal Bayar", value: (invoice) => invoice.paymentDate },
];
