"use client";

import Link from "next/link";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  Circle,
  FileText,
  Truck,
  X,
} from "lucide-react";
import { useState } from "react";

import { StatusBadge } from "@/components/delivery-orders/status-badge";
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
  calculateGrossMargin,
  calculateGrossMarginPercentage,
  formatTonnage,
} from "@/lib/delivery-orders";
import { formatDateID, formatRupiah } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery-order";

interface DeliveryOrderDetailProps {
  initialOrder: DeliveryOrder;
}

type DialogType = "partner-payment" | "customer-payment" | null;

const today = new Date().toISOString().slice(0, 10);

const lifecycleSteps = [
  "DO Dibuat",
  "Mitra Dibayar",
  "Invoice Dibuat",
  "Tambang Membayar",
  "Lengkap",
];

const statusStepIndex: Record<DeliveryOrderStatus, number> = {
  UNPAID_PARTNER: 1,
  PARTNER_PAID_NOT_INVOICED: 2,
  WAITING_CUSTOMER_PAYMENT: 3,
  COMPLETED: 4,
};

export function DeliveryOrderDetail({ initialOrder }: DeliveryOrderDetailProps) {
  const [order, setOrder] = useState<DeliveryOrder>(initialOrder);
  const [activeDialog, setActiveDialog] = useState<DialogType>(null);
  const [toastMessage, setToastMessage] = useState("");

  function handlePartnerPayment(paymentDate: string) {
    setOrder((current) => ({
      ...current,
      partnerPaidAt: paymentDate,
      status: "PARTNER_PAID_NOT_INVOICED",
    }));
    setActiveDialog(null);
    setToastMessage("Pembayaran mitra berhasil dicatat.");
  }

  function handleCustomerPayment(paymentDate: string) {
    setOrder((current) => ({
      ...current,
      customerPaidAt: paymentDate,
      status: "COMPLETED",
    }));
    setActiveDialog(null);
    setToastMessage("Pembayaran tambang berhasil dicatat.");
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
        <div className="flex items-center justify-between gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
          <span>{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage("")}
            className="rounded-md p-1 hover:bg-emerald-100 dark:hover:bg-emerald-900/50"
            aria-label="Tutup notifikasi"
          >
            <X className="size-4" />
          </button>
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
              <StatusBadge status={order.status} />
            </div>
          </div>
          <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-2 lg:min-w-[520px]">
            <HeaderFact icon={<Truck className="size-4" />} value={order.truckPlate} />
            <HeaderFact value={formatDateID(order.loadingDate)} />
            <HeaderFact value={order.partnerName} />
            <HeaderFact value={order.customerName} />
          </div>
        </div>
      </section>

      <LifecycleProgress status={order.status} />

      <section className="grid gap-6 xl:grid-cols-3">
        <OperationalCard order={order} />
        <PurchaseCard order={order} />
        <SalesCard order={order} />
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <FinancialSummary order={order} />
        <WorkflowActions
          order={order}
          onOpenDialog={setActiveDialog}
        />
      </section>

      {activeDialog === "partner-payment" ? (
        <PartnerPaymentDialog
          order={order}
          onClose={() => setActiveDialog(null)}
          onConfirm={handlePartnerPayment}
        />
      ) : null}

      {activeDialog === "customer-payment" ? (
        <CustomerPaymentDialog
          order={order}
          onClose={() => setActiveDialog(null)}
          onConfirm={handleCustomerPayment}
        />
      ) : null}
    </div>
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

function LifecycleProgress({ status }: { status: DeliveryOrderStatus }) {
  const currentStep = statusStepIndex[status];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Lifecycle Delivery Order</CardTitle>
        <CardDescription>
          Alur operasional-finansial dari DO dibuat sampai pembayaran tambang selesai.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-5">
          {lifecycleSteps.map((step, index) => {
            const isComplete = index < currentStep || status === "COMPLETED";
            const isCurrent = index === currentStep && status !== "COMPLETED";

            return (
              <div key={step} className="relative flex gap-3 md:block">
                {index < lifecycleSteps.length - 1 ? (
                  <div className="absolute left-4 top-9 h-[calc(100%-1rem)] w-px bg-border md:left-[calc(50%+1rem)] md:top-4 md:h-px md:w-[calc(100%-2rem)]" />
                ) : null}
                <div className="relative z-10 flex md:justify-center">
                  <div
                    className={cn(
                      "flex size-8 items-center justify-center rounded-full border bg-background",
                      isComplete
                        ? "border-emerald-500 bg-emerald-500 text-white"
                        : isCurrent
                          ? "border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300"
                          : "text-muted-foreground",
                    )}
                  >
                    {isComplete ? <Check className="size-4" /> : <Circle className="size-4" />}
                  </div>
                </div>
                <div className="pb-2 md:mt-3 md:text-center">
                  <p className="text-sm font-medium">{step}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {isComplete ? "Selesai" : isCurrent ? "Tahap berikutnya" : "Menunggu"}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function OperationalCard({ order }: { order: DeliveryOrder }) {
  return (
    <InfoCard title="Informasi Operasional">
      <InfoRow label="No DO" value={order.doNumber} />
      <InfoRow label="No Polisi" value={order.truckPlate} />
      <InfoRow label="Nama Pengemudi" value={order.driverName} />
      <InfoRow label="Mitra" value={order.partnerName} />
      <InfoRow label="Tambang" value={order.customerName} />
      <InfoRow label="Tambang Asal" value={order.originMine} />
      <InfoRow label="Pelabuhan Tujuan" value={order.destinationPort} />
      <InfoRow label="Tanggal Muat" value={formatDateID(order.loadingDate)} />
      <InfoRow label="Tanggal Bongkar" value={formatDateID(order.unloadingDate)} />
      <InfoRow label="Tonase" value={formatTonnage(order.tonnage)} />
    </InfoCard>
  );
}

function PurchaseCard({ order }: { order: DeliveryOrder }) {
  return (
    <InfoCard title="Pembelian / Mitra">
      <InfoRow label="No Invoice Mitra" value={order.partnerInvoiceNumber} />
      <InfoRow label="Harga Angkut" value={formatRupiah(order.transportPrice)} />
      <InfoRow label="Uang Jalan" value={formatRupiah(order.roadMoney)} />
      <InfoRow label="Uang Pijak Gas" value={formatRupiah(order.gasMoney)} />
      <InfoRow label="PPh 23 Mitra" value={formatRupiah(order.partnerPph23)} />
      <InfoRow label="Total Pembelian" value={formatRupiah(order.purchaseTotal)} strong />
      <InfoRow
        label="Status Pembayaran"
        value={<PaymentBadge isPaid={Boolean(order.partnerPaidAt)} unpaidLabel="Belum Dibayar" />}
      />
      <InfoRow label="Tanggal Bayar Mitra" value={formatDateID(order.partnerPaidAt)} />
    </InfoCard>
  );
}

function SalesCard({ order }: { order: DeliveryOrder }) {
  if (!order.salesInvoiceNumber) {
    return (
      <InfoCard title="Penjualan / Tambang">
        <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
          Invoice belum dibuat.
        </div>
      </InfoCard>
    );
  }

  return (
    <InfoCard title="Penjualan / Tambang">
      <InfoRow label="No Invoice Penjualan" value={order.salesInvoiceNumber} />
      <InfoRow label="Tanggal Invoice" value={formatDateID(order.salesInvoiceDate)} />
      <InfoRow label="Harga Jual" value={formatRupiah(order.sellingPrice)} />
      <InfoRow label="Uang Pijak Gas" value={formatRupiah(order.salesGasMoney)} />
      <InfoRow label="PPh 23 Penjualan" value={formatRupiah(order.salesPph23)} />
      <InfoRow label="Total Penjualan" value={formatRupiah(order.salesTotal)} strong />
      <InfoRow
        label="Status Pembayaran"
        value={
          <PaymentBadge
            isPaid={Boolean(order.customerPaidAt)}
            unpaidLabel="Menunggu Pembayaran"
          />
        }
      />
      <InfoRow
        label="Tanggal Pembayaran Tambang"
        value={formatDateID(order.customerPaidAt)}
      />
    </InfoCard>
  );
}

function FinancialSummary({ order }: { order: DeliveryOrder }) {
  const hasInvoice = Boolean(order.salesInvoiceNumber);
  const grossMargin = calculateGrossMargin(order);
  const marginPercentage = calculateGrossMarginPercentage(order);
  const isCompleted = order.status === "COMPLETED";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ringkasan Nilai DO</CardTitle>
        <CardDescription>
          Pembelian, penjualan, dan margin operasional berdasarkan data DO ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryLine label="Total Pembelian" value={formatRupiah(order.purchaseTotal)} />
        {hasInvoice ? (
          <>
            <SummaryLine label="Total Penjualan" value={formatRupiah(order.salesTotal)} />
            <SummaryLine
              label={isCompleted ? "Margin Terealisasi" : "Margin Kotor"}
              value={formatRupiah(grossMargin)}
              highlight={isCompleted}
            />
            <SummaryLine label="Margin %" value={`${marginPercentage.toFixed(2)}%`} />
          </>
        ) : (
          <div className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
            Belum tersedia sampai invoice penjualan dibuat.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function WorkflowActions({
  order,
  onOpenDialog,
}: {
  order: DeliveryOrder;
  onOpenDialog: (dialog: DialogType) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Tindakan Selanjutnya</CardTitle>
        <CardDescription>
          Aksi hanya mengikuti urutan workflow yang valid untuk status saat ini.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {order.status === "UNPAID_PARTNER" ? (
          <ActionState
            title="Mitra belum dibayar."
            description="Catat pembayaran ke mitra untuk melanjutkan proses invoice penjualan."
            buttonLabel="Tandai Mitra Dibayar"
            onClick={() => onOpenDialog("partner-payment")}
          />
        ) : null}

        {order.status === "PARTNER_PAID_NOT_INVOICED" ? (
          <ActionState
            title="Pembayaran mitra sudah tercatat."
            description="Buat invoice penjualan untuk mulai menagih Tambang."
            buttonLabel="Buat Invoice Penjualan"
            href={`/invoices/${order.id}`}
          />
        ) : null}

        {order.status === "WAITING_CUSTOMER_PAYMENT" ? (
          <ActionState
            title="Menunggu pembayaran tambang."
            description="Catat pembayaran dari Tambang setelah tagihan diterima."
            buttonLabel="Tandai Tambang Dibayar"
            onClick={() => onOpenDialog("customer-payment")}
          />
        ) : null}

        {order.status === "COMPLETED" ? (
          <div className="space-y-4">
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
              <div className="flex items-center gap-2 font-semibold">
                <CheckCircle2 className="size-4" />
                DO telah lengkap.
              </div>
              <p className="mt-2">
                Pembayaran mitra dan pembayaran tambang telah tercatat.
              </p>
            </div>
            <InfoRow label="Invoice" value={order.salesInvoiceNumber} />
            <InfoRow label="Tanggal Lengkap" value={formatDateID(order.customerPaidAt)} />
            <InfoRow
              label="Margin Terealisasi"
              value={formatRupiah(calculateGrossMargin(order))}
              strong
            />
            <div className="flex flex-wrap gap-2">
              <InvoiceLink orderId={order.id} />
              <Button type="button" variant="outline" disabled>
                Bukti Pembayaran Mitra
              </Button>
            </div>
          </div>
        ) : null}

        {order.salesInvoiceNumber && order.status !== "COMPLETED" ? (
          <InvoiceLink orderId={order.id} />
        ) : null}

        {order.partnerPaidAt ? (
          <Link
            href={`/delivery-orders/${order.id}/payment-proof`}
            className={cn(buttonVariants({ variant: "outline" }))}
          >
            Lihat Bukti Pembayaran
          </Link>
        ) : null}
      </CardContent>
    </Card>
  );
}

function ActionState({
  title,
  description,
  buttonLabel,
  onClick,
  href,
}: {
  title: string;
  description: string;
  buttonLabel: string;
  onClick?: () => void;
  href?: string;
}) {
  return (
    <div className="space-y-4">
      <div>
        <p className="font-medium">{title}</p>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {href ? (
        <Link href={href} className={cn(buttonVariants())}>
          {buttonLabel}
        </Link>
      ) : (
        <Button type="button" onClick={onClick}>
          {buttonLabel}
        </Button>
      )}
    </div>
  );
}

function InvoiceLink({ orderId }: { orderId: string }) {
  return (
    <Link
      href={`/invoices/${orderId}`}
      className={cn(buttonVariants({ variant: "outline" }))}
    >
      <FileText />
      Lihat Invoice
    </Link>
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

function InfoRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value?: React.ReactNode;
  strong?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b pb-2 last:border-0 last:pb-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("max-w-[60%] text-right text-sm", strong ? "font-semibold" : "font-medium")}>
        {value || "-"}
      </span>
    </div>
  );
}

function SummaryLine({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-4 rounded-md border p-3",
        highlight ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/40" : "",
      )}
    >
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="font-semibold">{value}</span>
    </div>
  );
}

function PaymentBadge({
  isPaid,
  unpaidLabel,
}: {
  isPaid: boolean;
  unpaidLabel: string;
}) {
  return isPaid ? (
    <Badge className="border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300">
      Sudah Dibayar
    </Badge>
  ) : (
    <Badge variant="outline" className="text-muted-foreground">
      {unpaidLabel}
    </Badge>
  );
}

function PartnerPaymentDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: DeliveryOrder;
  onClose: () => void;
  onConfirm: (paymentDate: string) => void;
}) {
  const [paymentDate, setPaymentDate] = useState(today);

  return (
    <ModalShell title="Konfirmasi Pembayaran Mitra" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tindakan ini akan mencatat pembayaran ke mitra dan memindahkan DO ke tahap pembuatan invoice penjualan.
      </p>
      <div className="space-y-4">
        <InfoRow label="Mitra" value={order.partnerName} />
        <InfoRow label="Total Pembayaran" value={formatRupiah(order.purchaseTotal)} strong />
        <FormInput label="Tanggal Pembayaran" type="date" value={paymentDate} onChange={setPaymentDate} />
        <FormInput label="Nomor Referensi Pembayaran" value="" onChange={() => undefined} />
      </div>
      <DialogActions onClose={onClose} onConfirm={() => onConfirm(paymentDate)} confirmLabel="Konfirmasi Pembayaran" />
    </ModalShell>
  );
}

function CustomerPaymentDialog({
  order,
  onClose,
  onConfirm,
}: {
  order: DeliveryOrder;
  onClose: () => void;
  onConfirm: (paymentDate: string) => void;
}) {
  const [paymentDate, setPaymentDate] = useState(today);

  return (
    <ModalShell title="Konfirmasi Pembayaran Tambang" onClose={onClose}>
      <p className="mb-4 text-sm text-muted-foreground">
        Tindakan ini mencatat pembayaran dari Tambang dan menyelesaikan lifecycle DO.
      </p>
      <div className="space-y-4">
        <InfoRow label="Invoice" value={order.salesInvoiceNumber} />
        <InfoRow label="Tambang" value={order.customerName} />
        <InfoRow label="Total Tagihan" value={formatRupiah(order.salesTotal)} strong />
        <FormInput label="Tanggal Pembayaran" type="date" value={paymentDate} onChange={setPaymentDate} />
        <FormInput label="Nomor Referensi" value="" onChange={() => undefined} />
      </div>
      <DialogActions onClose={onClose} onConfirm={() => onConfirm(paymentDate)} confirmLabel="Konfirmasi Pembayaran" />
    </ModalShell>
  );
}

function ModalShell({
  title,
  children,
  onClose,
  maxWidth = "max-w-xl",
}: {
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  maxWidth?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="do-dialog-title"
        className={cn(
          "max-h-[90vh] w-full overflow-y-auto rounded-lg border bg-background p-5 shadow-xl",
          maxWidth,
        )}
      >
        <div className="mb-5 flex items-center justify-between gap-4 border-b pb-4">
          <h3 id="do-dialog-title" className="text-lg font-semibold">
            {title}
          </h3>
          <Button type="button" variant="ghost" size="icon-sm" onClick={onClose}>
            <X />
            <span className="sr-only">Tutup</span>
          </Button>
        </div>
        {children}
      </section>
    </div>
  );
}

function DialogActions({
  onClose,
  onConfirm,
  confirmLabel,
}: {
  onClose: () => void;
  onConfirm: () => void;
  confirmLabel: string;
}) {
  return (
    <div className="mt-6 flex justify-end gap-2 border-t pt-4">
      <Button type="button" variant="outline" onClick={onClose}>
        Batal
      </Button>
      <Button type="button" onClick={onConfirm}>
        {confirmLabel}
      </Button>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: "text" | "date" | "number";
}) {
  return (
    <label className="block text-sm font-medium">
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
