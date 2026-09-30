"use client";

import Link from "next/link";
import { ArrowLeft, FileText, Truck } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { deriveAggregateDeliveryOrderStatus } from "@/lib/invoice";
import { cn } from "@/lib/utils";
import type { StoreActionResult, UpdateResult } from "@/stores/demo-store";
import type {
  DeliveryOrder,
  DeliveryOrderTransaction,
  SalesInvoice,
} from "@/types/delivery-order";

interface DeliveryOrderDetailProps {
  order: DeliveryOrder;
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  onUpdateOrder: (
    id: string,
    updates: Partial<DeliveryOrder>,
  ) => UpdateResult<DeliveryOrder>;
  onUpdateTransaction: (
    id: string,
    updates: Partial<DeliveryOrderTransaction>,
  ) => StoreActionResult<DeliveryOrderTransaction>;
  onMarkInvoicePaid: (id: string, paymentDate: string) => StoreActionResult<SalesInvoice>;
}

export function DeliveryOrderDetail({
  order,
  transactions,
  invoices,
  onUpdateTransaction,
  onMarkInvoicePaid,
}: DeliveryOrderDetailProps) {
  const [toastMessage, setToastMessage] = useState("");
  const totals = getTransactionTotals(transactions);
  const aggregateStatus = deriveAggregateDeliveryOrderStatus(transactions, invoices);
  const orderInvoices = invoices.filter((invoice) =>
    invoice.lines.some((line) => line.deliveryOrderId === order.id),
  );

  function handlePartnerPaid(transactionId: string) {
    const result = onUpdateTransaction(transactionId, {
      partnerPaidAt: new Date().toISOString().slice(0, 10),
      partnerPaymentStatus: "PAID",
    });

    setToastMessage(
      result.ok ? "Pembayaran mitra berhasil dicatat." : `Gagal mencatat pembayaran: ${result.reason}`,
    );
  }

  function handleInvoicePaid(invoiceId: string) {
    const result = onMarkInvoicePaid(invoiceId, new Date().toISOString().slice(0, 10));

    setToastMessage(
      result.ok ? "Pembayaran customer berhasil dicatat." : `Gagal mencatat pembayaran: ${result.reason}`,
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href="/delivery-orders"
        className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
      >
        <ArrowLeft className="size-4" />
        Kembali ke Tracking DO
      </Link>

      {toastMessage ? (
        <div className="rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          {toastMessage}
        </div>
      ) : null}

      <section className="rounded-lg border bg-card p-5 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Delivery Order</p>
            <div className="mt-2 flex flex-wrap items-center gap-3">
              <h2 className="text-2xl font-semibold tracking-tight md:text-3xl">
                {order.doNumber}
              </h2>
              <AggregateStatusBadge status={aggregateStatus} />
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Status parent dihitung dari {transactions.length} transaksi agar tidak menyesatkan saat status anak berbeda.
            </p>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[520px]">
            <HeaderFact icon={<Truck className="size-4" />} value={`${transactions.length} transaksi`} />
            <HeaderFact value={order.partnerName} />
            <HeaderFact value={order.customerName} />
            <HeaderFact value={`${order.originMine} -> ${order.destinationPort}`} />
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-3">
        <InfoCard title="Parent DO Summary">
          <InfoRow label="No DO" value={order.doNumber} />
          <InfoRow label="Tambang" value={order.customerName} />
          <InfoRow label="Mitra" value={order.partnerName} />
          <InfoRow label="Origin" value={order.originMine} />
          <InfoRow label="Destination" value={order.destinationPort} />
        </InfoCard>
        <InfoCard title="Default Tarif">
          <InfoRow label="Tarif Jual / Ton" value={formatRupiah(order.defaultRates?.salesRatePerTon ?? 0)} />
          <InfoRow label="Uang Jalan / Rit" value={formatRupiah(order.defaultRates?.roadMoney ?? 0)} />
          <InfoRow label="Tarif Mitra / Ton" value={formatRupiah(order.defaultRates?.partnerRatePerTon ?? 0)} />
          <InfoRow label="Uang Gas" value={formatRupiah(order.defaultRates?.gasMoney ?? 0)} />
        </InfoCard>
        <InfoCard title="Ringkasan Transaksi">
          <InfoRow label="Jumlah Transaksi" value={String(transactions.length)} />
          <InfoRow label="Total Tonase" value={formatTonnage(totals.tonnage)} />
          <InfoRow label="Estimasi Customer" value={formatRupiah(totals.customerAmount)} strong />
          <InfoRow label="Estimasi Mitra" value={formatRupiah(totals.partnerAmount)} strong />
        </InfoCard>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <TransactionTable
          transactions={transactions}
          invoices={invoices}
          onPartnerPaid={handlePartnerPaid}
        />
        <WorkflowActions
          transactions={transactions}
          invoices={orderInvoices}
          onInvoicePaid={handleInvoicePaid}
        />
      </section>
    </div>
  );
}

function TransactionTable({
  transactions,
  invoices,
  onPartnerPaid,
}: {
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  onPartnerPaid: (transactionId: string) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Transaksi Angkutan</CardTitle>
        <CardDescription>Status invoice dan pembayaran mitra ditampilkan per transaksi.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="hidden overflow-x-auto md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>No SPB</TableHead>
                <TableHead>No Polisi</TableHead>
                <TableHead>Supir</TableHead>
                <TableHead>Tanggal</TableHead>
                <TableHead className="text-right">Tonase</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Bayar Mitra</TableHead>
                <TableHead className="text-right">Estimasi Customer</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((transaction) => (
                <TableRow key={transaction.id}>
                  <TableCell className="font-semibold">{transaction.transactionNumber}</TableCell>
                  <TableCell>{transaction.truckPlate}</TableCell>
                  <TableCell>{transaction.driverName}</TableCell>
                  <TableCell>{formatDateID(transaction.loadingDate)}</TableCell>
                  <TableCell className="text-right">{formatTonnage(transaction.tonnage)}</TableCell>
                  <TableCell><InvoiceBadge transaction={transaction} invoices={invoices} /></TableCell>
                  <TableCell><PartnerPaymentBadge transaction={transaction} onPartnerPaid={onPartnerPaid} /></TableCell>
                  <TableCell className="text-right">{formatRupiah(getCustomerAmount(transaction))}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="space-y-3 md:hidden">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="rounded-lg border p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{transaction.transactionNumber}</p>
                  <p className="text-sm text-muted-foreground">{transaction.truckPlate} · {transaction.driverName}</p>
                </div>
                <InvoiceBadge transaction={transaction} invoices={invoices} />
              </div>
              <div className="mt-4 space-y-2 text-sm">
                <InfoRow label="Tanggal Muat" value={formatDateID(transaction.loadingDate)} />
                <InfoRow label="Rute" value={`${transaction.loadingLocation} -> ${transaction.unloadingLocation}`} />
                <InfoRow label="Tonase" value={formatTonnage(transaction.tonnage)} />
                <InfoRow label="Bayar Mitra" value={<PartnerPaymentBadge transaction={transaction} onPartnerPaid={onPartnerPaid} />} />
                <InfoRow label="Estimasi Customer" value={formatRupiah(getCustomerAmount(transaction))} strong />
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function WorkflowActions({
  transactions,
  invoices,
  onInvoicePaid,
}: {
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  onInvoicePaid: (invoiceId: string) => void;
}) {
  const unpaidPartnerCount = transactions.filter(
    (transaction) => transaction.partnerPaymentStatus !== "PAID",
  ).length;
  const eligibleCount = transactions.filter(
    (transaction) => transaction.partnerPaymentStatus === "PAID" && !transaction.salesInvoiceId,
  ).length;
  const issuedInvoices = invoices.filter((invoice) => invoice.status === "ISSUED");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tindakan Selanjutnya</CardTitle>
        <CardDescription>Aksi mengikuti status transaksi dan invoice yang relevan.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {unpaidPartnerCount > 0 ? (
          <ActionNote
            title={`${unpaidPartnerCount} transaksi belum dibayar ke mitra.`}
            description="Gunakan tombol Tandai Dibayar pada baris transaksi untuk membuat transaksi eligible invoice."
          />
        ) : null}

        {eligibleCount > 0 ? (
          <div className="space-y-3 rounded-md border p-4">
            <div>
              <p className="font-medium">{eligibleCount} transaksi siap ditagih.</p>
              <p className="mt-1 text-sm text-muted-foreground">Buat invoice baru dari transaksi yang sudah dibayar ke mitra.</p>
            </div>
            <Link href="/invoices/new" className={cn(buttonVariants())}>
              Buat Invoice Penjualan
            </Link>
          </div>
        ) : null}

        {issuedInvoices.map((invoice) => (
          <div key={invoice.id} className="space-y-3 rounded-md border p-4">
            <div>
              <p className="font-medium">Invoice {invoice.invoiceNumber} menunggu pembayaran.</p>
              <p className="mt-1 text-sm text-muted-foreground">Tandai paid untuk menyelesaikan transaksi terkait.</p>
            </div>
            <Button type="button" onClick={() => onInvoicePaid(invoice.id)}>
              Tandai Customer Dibayar
            </Button>
          </div>
        ))}

        {unpaidPartnerCount === 0 && eligibleCount === 0 && issuedInvoices.length === 0 ? (
          <ActionNote title="Tidak ada aksi berikutnya." description="Semua transaksi sedang menunggu invoice lain, cancelled, atau sudah selesai." />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionNote({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-md border border-dashed p-4">
      <p className="font-medium">{title}</p>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function AggregateStatusBadge({ status }: { status: ReturnType<typeof deriveAggregateDeliveryOrderStatus> }) {
  if (status === "MIXED") {
    return <Badge variant="outline" className="text-amber-700">Status Campuran</Badge>;
  }

  const labels = {
    UNPAID_PARTNER: "Belum Dibayar Mitra",
    PARTNER_PAID_NOT_INVOICED: "Siap Ditagih",
    WAITING_CUSTOMER_PAYMENT: "Menunggu Customer",
    COMPLETED: "Lengkap",
  } satisfies Record<Exclude<typeof status, "MIXED">, string>;

  return <Badge variant="outline">{labels[status]}</Badge>;
}

function InvoiceBadge({ transaction, invoices }: { transaction: DeliveryOrderTransaction; invoices: SalesInvoice[] }) {
  if (!transaction.salesInvoiceId) {
    const isEligible = transaction.partnerPaymentStatus === "PAID";
    return <Badge variant="outline" className={isEligible ? "text-emerald-700" : "text-muted-foreground"}>{isEligible ? "Eligible" : "Belum eligible"}</Badge>;
  }

  const invoice = invoices.find((candidate) => candidate.id === transaction.salesInvoiceId);
  return (
    <Link href={`/invoices/${invoice?.id ?? transaction.salesInvoiceId}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
      <FileText />
      {invoice?.invoiceNumber ?? "Invoice"}
    </Link>
  );
}

function PartnerPaymentBadge({ transaction, onPartnerPaid }: { transaction: DeliveryOrderTransaction; onPartnerPaid: (transactionId: string) => void }) {
  return transaction.partnerPaymentStatus === "PAID" ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      Sudah Dibayar
    </Badge>
  ) : (
    <Button type="button" variant="outline" size="sm" onClick={() => onPartnerPaid(transaction.id)}>
      Tandai Dibayar
    </Button>
  );
}

function HeaderFact({ icon, value }: { icon?: React.ReactNode; value: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-background px-3 py-2">
      {icon}
      <span className="truncate">{value}</span>
    </div>
  );
}

function InfoCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">{children}</CardContent>
    </Card>
  );
}

function InfoRow({ label, value, strong = false }: { label: string; value?: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("max-w-[60%] text-right text-sm", strong ? "font-semibold" : "font-medium")}>
        {value || "-"}
      </span>
    </div>
  );
}

function getCustomerAmount(transaction: DeliveryOrderTransaction): number {
  return transaction.tonnage * transaction.salesRatePerTon + transaction.roadMoney;
}

function getTransactionTotals(transactions: DeliveryOrderTransaction[]) {
  return transactions.reduce(
    (totals, transaction) => ({
      tonnage: totals.tonnage + transaction.tonnage,
      customerAmount: totals.customerAmount + getCustomerAmount(transaction),
      partnerAmount:
        totals.partnerAmount +
        transaction.tonnage * transaction.partnerRatePerTon +
        transaction.gasMoney,
    }),
    { tonnage: 0, customerAmount: 0, partnerAmount: 0 },
  );
}
