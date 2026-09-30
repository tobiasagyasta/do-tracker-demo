"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { startTransition, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { formatTonnage } from "@/lib/delivery-orders";
import { formatRupiah } from "@/lib/format";
import {
  INVOICE_PPH23_RATE,
  calculateSalesInvoiceTotals,
  createInvoiceLineSnapshot,
} from "@/lib/invoice";
import { cn } from "@/lib/utils";
import type { StoreActionResult } from "@/stores/demo-store";
import type {
  DeliveryOrder,
  DeliveryOrderTransaction,
  IssueSalesInvoiceInput,
  SalesInvoice,
} from "@/types/delivery-order";

interface InvoiceBuilderProps {
  deliveryOrders: DeliveryOrder[];
  eligibleTransactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  onIssueInvoice: (input: IssueSalesInvoiceInput) => StoreActionResult<SalesInvoice>;
}

interface InvoiceFormState {
  customerName: string;
  invoiceDate: string;
  invoiceNumber: string;
  purchaseOrderReference: string;
  billingAddress: string;
  taxId: string;
  pph23Rate: string;
  rentalDepositDeduction: string;
  notes: string;
}

const today = new Date().toISOString().slice(0, 10);

export function InvoiceBuilder({
  deliveryOrders,
  eligibleTransactions,
  invoices,
  onIssueInvoice,
}: InvoiceBuilderProps) {
  const router = useRouter();
  const [form, setForm] = useState<InvoiceFormState>(() => ({
    customerName: "",
    invoiceDate: today,
    invoiceNumber: generateInvoiceNumber(invoices.length + 1),
    purchaseOrderReference: "",
    billingAddress: "",
    taxId: "",
    pph23Rate: String(INVOICE_PPH23_RATE),
    rentalDepositDeduction: "0",
    notes: "",
  }));
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const ordersById = useMemo(
    () => new Map(deliveryOrders.map((order) => [order.id, order])),
    [deliveryOrders],
  );
  const customers = useMemo(
    () =>
      [...new Set(eligibleTransactions.map((transaction) => ordersById.get(transaction.deliveryOrderId)?.customerName).filter(Boolean) as string[])].sort((a, b) => a.localeCompare(b, "id-ID")),
    [eligibleTransactions, ordersById],
  );
  const visibleTransactions = useMemo(
    () =>
      form.customerName
        ? eligibleTransactions.filter(
            (transaction) => ordersById.get(transaction.deliveryOrderId)?.customerName === form.customerName,
          )
        : [],
    [eligibleTransactions, form.customerName, ordersById],
  );
  const groupedTransactions = useMemo(
    () => groupTransactionsByDeliveryOrder(visibleTransactions, ordersById),
    [visibleTransactions, ordersById],
  );
  const selectedTransactions = visibleTransactions.filter((transaction) => selectedIds.has(transaction.id));
  const draftInvoice = useMemo(
    () => buildDraftInvoice(form, selectedTransactions, ordersById),
    [form, ordersById, selectedTransactions],
  );
  function updateForm<Key extends keyof InvoiceFormState>(key: Key, value: InvoiceFormState[Key]) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrorMessage("");

    if (key === "customerName") {
      setSelectedIds(new Set());
    }
  }

  function toggleTransaction(transactionId: string, checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (checked) next.add(transactionId);
      else next.delete(transactionId);
      return next;
    });
  }

  function toggleAllVisible(checked: boolean) {
    setSelectedIds(() => checked ? new Set(visibleTransactions.map((transaction) => transaction.id)) : new Set());
  }

  function toggleGroup(transactionIds: string[], checked: boolean) {
    setSelectedIds((current) => {
      const next = new Set(current);
      for (const id of transactionIds) {
        if (checked) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function handleIssue() {
    if (isSubmitting) return;
    setErrorMessage("");

    if (!form.customerName) {
      setErrorMessage("Pilih customer terlebih dahulu.");
      return;
    }

    if (selectedTransactions.length === 0) {
      setErrorMessage("Pilih minimal satu transaksi.");
      return;
    }

    if (!form.invoiceNumber.trim()) {
      setErrorMessage("Nomor invoice wajib diisi.");
      return;
    }

    setIsSubmitting(true);
    const result = onIssueInvoice({
      id: `inv-${Date.now()}`,
      invoiceNumber: form.invoiceNumber.trim(),
      invoiceDate: form.invoiceDate,
      customerBillingDetails: {
        name: form.customerName,
        address: form.billingAddress.trim() || undefined,
        taxId: form.taxId.trim() || undefined,
      },
      purchaseOrderReference: form.purchaseOrderReference.trim() || undefined,
      transactionIds: selectedTransactions.map((transaction) => transaction.id),
      pph23Rate: toNumber(form.pph23Rate),
      rentalDepositDeduction: toNumber(form.rentalDepositDeduction),
      notes: form.notes.trim() || undefined,
    });

    if (!result.ok) {
      setIsSubmitting(false);
      setErrorMessage(getIssueErrorMessage(result));
      return;
    }

    startTransition(() => router.push(`/invoices/${result.record.id}`));
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <Link href="/invoices" className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline">
        <ArrowLeft className="size-4" />
        Kembali ke Daftar Invoice
      </Link>

      <div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">Buat Invoice Penjualan</h2>
        <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
          Pilih transaksi eligible dari satu customer, bisa lintas Delivery Order.
        </p>
      </div>

      {errorMessage ? (
        <div className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive" role="alert">
          {errorMessage}
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>1. Pilih Customer</CardTitle>
              <CardDescription>Transaksi yang tampil akan dibatasi ke customer ini.</CardDescription>
            </CardHeader>
            <CardContent>
              <label className="block text-sm font-medium">
                Customer / Tambang
                <select
                  value={form.customerName}
                  onChange={(event) => updateForm("customerName", event.target.value)}
                  className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30"
                >
                  <option value="">Pilih customer...</option>
                  {customers.map((customer) => <option key={customer} value={customer}>{customer}</option>)}
                </select>
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>2. Detail Invoice</CardTitle>
              <CardDescription>Nomor invoice dibuat otomatis tetapi bisa diedit.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormInput label="Tanggal Invoice" type="date" value={form.invoiceDate} onChange={(value) => updateForm("invoiceDate", value)} />
              <FormInput label="No Invoice" value={form.invoiceNumber} onChange={(value) => updateForm("invoiceNumber", value)} />
              <FormInput label="PO / Referensi" value={form.purchaseOrderReference} onChange={(value) => updateForm("purchaseOrderReference", value)} />
              <FormInput label="NPWP Customer" value={form.taxId} onChange={(value) => updateForm("taxId", value)} />
              <label className="block text-sm font-medium md:col-span-2">
                Alamat Billing
                <textarea value={form.billingAddress} onChange={(event) => updateForm("billingAddress", event.target.value)} className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" />
              </label>
              <FormInput label="PPh 23 Rate" inputMode="decimal" value={form.pph23Rate} onChange={(value) => updateForm("pph23Rate", value)} />
              <FormInput label="DP Sewa Deduction" inputMode="numeric" value={form.rentalDepositDeduction} onChange={(value) => updateForm("rentalDepositDeduction", value)} />
              <label className="block text-sm font-medium md:col-span-2">
                Notes
                <textarea value={form.notes} onChange={(event) => updateForm("notes", event.target.value)} className="mt-2 min-h-20 w-full rounded-md border bg-background px-3 py-2 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" />
              </label>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>3. Pilih Transaksi</CardTitle>
                <CardDescription>Hanya transaksi eligible, belum invoiced, dan sesuai customer yang tampil.</CardDescription>
              </div>
              <label className="flex items-center gap-2 text-sm font-medium">
                <input
                  type="checkbox"
                  checked={visibleTransactions.length > 0 && visibleTransactions.every((transaction) => selectedIds.has(transaction.id))}
                  onChange={(event) => toggleAllVisible(event.target.checked)}
                  className="size-4 rounded border"
                />
                Select all visible
              </label>
            </CardHeader>
            <CardContent className="space-y-4">
              {!form.customerName ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Pilih customer untuk melihat transaksi.</p>
              ) : groupedTransactions.length === 0 ? (
                <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">Tidak ada transaksi eligible untuk customer ini.</p>
              ) : groupedTransactions.map((group) => (
                <TransactionGroupCard
                  key={group.order.id}
                  group={group}
                  selectedIds={selectedIds}
                  onToggleGroup={toggleGroup}
                  onToggleTransaction={toggleTransaction}
                />
              ))}
            </CardContent>
          </Card>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <SelectionSummary
            invoice={draftInvoice}
            selectedTransactionCount={selectedTransactions.length}
            onIssue={handleIssue}
            isSubmitting={isSubmitting}
          />
        </aside>
      </div>
    </div>
  );
}

interface TransactionGroup {
  order: DeliveryOrder;
  transactions: DeliveryOrderTransaction[];
}

function TransactionGroupCard({
  group,
  selectedIds,
  onToggleGroup,
  onToggleTransaction,
}: {
  group: TransactionGroup;
  selectedIds: Set<string>;
  onToggleGroup: (transactionIds: string[], checked: boolean) => void;
  onToggleTransaction: (transactionId: string, checked: boolean) => void;
}) {
  const transactionIds = group.transactions.map((transaction) => transaction.id);
  const selectedTransactions = group.transactions.filter((transaction) => selectedIds.has(transaction.id));
  const selectedTonnage = selectedTransactions.reduce((total, transaction) => total + transaction.tonnage, 0);
  const allSelected = transactionIds.every((id) => selectedIds.has(id));

  return (
    <section className="rounded-lg border p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <label className="flex items-center gap-2 font-semibold">
            <input type="checkbox" checked={allSelected} onChange={(event) => onToggleGroup(transactionIds, event.target.checked)} className="size-4 rounded border" />
            {group.order.doNumber}
          </label>
          <p className="mt-1 text-sm text-muted-foreground">{group.order.originMine} -&gt; {group.order.destinationPort}</p>
        </div>
        <p className="text-sm text-muted-foreground">
          {selectedTransactions.length}/{group.transactions.length} dipilih · {formatTonnage(selectedTonnage)}
        </p>
      </div>

      <div className="mt-4 hidden overflow-x-auto md:block">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left">
              <th className="py-2 pr-3">Pilih</th>
              <th className="py-2 pr-3">SPB</th>
              <th className="py-2 pr-3">Truck</th>
              <th className="py-2 pr-3 text-right">Tonase</th>
              <th className="py-2 pr-3 text-right">Tarif/Ton</th>
              <th className="py-2 pr-3 text-right">Uang Jalan</th>
            </tr>
          </thead>
          <tbody>
            {group.transactions.map((transaction) => (
              <tr key={transaction.id} className="border-b last:border-0">
                <td className="py-2 pr-3">
                  <label className="inline-flex items-center gap-2">
                    <input type="checkbox" checked={selectedIds.has(transaction.id)} onChange={(event) => onToggleTransaction(transaction.id, event.target.checked)} className="size-4 rounded border" />
                    <span className="sr-only">Pilih {transaction.transactionNumber}</span>
                  </label>
                </td>
                <td className="py-2 pr-3 font-medium">{transaction.transactionNumber}</td>
                <td className="py-2 pr-3">{transaction.truckPlate}</td>
                <td className="py-2 pr-3 text-right">{formatTonnage(transaction.tonnage)}</td>
                <td className="py-2 pr-3 text-right">{formatRupiah(transaction.salesRatePerTon)}</td>
                <td className="py-2 pr-3 text-right">{formatRupiah(transaction.roadMoney)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-4 space-y-3 md:hidden">
        {group.transactions.map((transaction) => (
          <label key={transaction.id} className="block rounded-md border p-3">
            <span className="flex items-start gap-3">
              <input type="checkbox" checked={selectedIds.has(transaction.id)} onChange={(event) => onToggleTransaction(transaction.id, event.target.checked)} className="mt-1 size-4 rounded border" />
              <span className="min-w-0 flex-1">
                <span className="block font-medium">{transaction.transactionNumber}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{transaction.truckPlate} · {formatTonnage(transaction.tonnage)}</span>
                <span className="mt-2 block text-sm">{formatRupiah(transaction.tonnage * transaction.salesRatePerTon + transaction.roadMoney)}</span>
              </span>
            </span>
          </label>
        ))}
      </div>
    </section>
  );
}

function SelectionSummary({
  invoice,
  selectedTransactionCount,
  onIssue,
  isSubmitting,
}: {
  invoice: SalesInvoice;
  selectedTransactionCount: number;
  onIssue: () => void;
  isSubmitting: boolean;
}) {
  const totals = calculateSalesInvoiceTotals(invoice);
  const totalTonnage = invoice.lines.reduce((sum, line) => sum + line.tonnage, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Selection Summary</CardTitle>
        <CardDescription>Ringkasan selalu mengikuti line snapshot draft.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <SummaryLine label="Transaksi" value={String(selectedTransactionCount)} />
        <SummaryLine label="DO Group" value={String(totals.groups.length)} />
        <SummaryLine label="Total Tonase" value={formatTonnage(totalTonnage)} />
        <SummaryLine label="Subtotal" value={formatRupiah(totals.subtotal)} />
        <SummaryLine label="PPh 23" value={`-${formatRupiah(totals.pph23Amount)}`} />
        <SummaryLine label="Setelah Pajak" value={formatRupiah(totals.totalAfterTax)} />
        <SummaryLine label="DP Sewa" value={`-${formatRupiah(totals.rentalDepositDeduction)}`} />
        <SummaryLine label="Grand Total" value={formatRupiah(totals.grandTotal)} strong />

        {totals.groups.length > 0 ? (
          <div className="space-y-2 border-t pt-3">
            {totals.groups.map((group) => {
              const rates = new Set(group.lines.map((line) => line.salesRatePerTon));
              return (
                <div key={group.deliveryOrderId} className="rounded-md border p-3 text-sm">
                  <p className="font-medium">{group.doNumber}</p>
                  <p className="mt-1 text-muted-foreground">{group.lines.length} trx · {formatTonnage(group.groupTonnage)}</p>
                  <p className="mt-1 text-muted-foreground">Tarif: {rates.size === 1 ? formatRupiah(group.lines[0].salesRatePerTon) : "Mixed rates"}</p>
                  <p className="mt-2 font-semibold">Subtotal {formatRupiah(group.groupSubtotal)}</p>
                </div>
              );
            })}
          </div>
        ) : null}

        <Button type="button" className="w-full" onClick={onIssue} disabled={isSubmitting || selectedTransactionCount === 0}>
          {isSubmitting ? "Menerbitkan..." : "Terbitkan Invoice"}
        </Button>
      </CardContent>
    </Card>
  );
}

function FormInput({ label, value, onChange, type = "text", inputMode }: { label: string; value: string; onChange: (value: string) => void; type?: "text" | "date"; inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"] }) {
  return (
    <label className="block text-sm font-medium">
      {label}
      <input value={value} type={type} inputMode={inputMode} onChange={(event) => onChange(event.target.value)} className="mt-2 h-9 w-full rounded-md border bg-background px-3 text-sm outline-none transition-colors focus:border-ring focus:ring-3 focus:ring-ring/30" />
    </label>
  );
}

function SummaryLine({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b pb-2 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={cn("text-right text-sm", strong ? "font-bold" : "font-semibold")}>{value}</span>
    </div>
  );
}

function groupTransactionsByDeliveryOrder(
  transactions: DeliveryOrderTransaction[],
  ordersById: Map<string, DeliveryOrder>,
): TransactionGroup[] {
  const groups = new Map<string, TransactionGroup>();

  for (const transaction of transactions) {
    const order = ordersById.get(transaction.deliveryOrderId);
    if (!order) continue;

    const existing = groups.get(order.id) ?? { order, transactions: [] };
    existing.transactions.push(transaction);
    groups.set(order.id, existing);
  }

  return [...groups.values()];
}

function buildDraftInvoice(
  form: InvoiceFormState,
  selectedTransactions: DeliveryOrderTransaction[],
  ordersById: Map<string, DeliveryOrder>,
): SalesInvoice {
  const lines = selectedTransactions.flatMap((transaction) => {
    const order = ordersById.get(transaction.deliveryOrderId);
    return order ? [createInvoiceLineSnapshot(transaction, order)] : [];
  });

  return {
    id: "draft",
    invoiceNumber: form.invoiceNumber,
    invoiceDate: form.invoiceDate,
    customerName: form.customerName,
    customerBillingDetails: {
      name: form.customerName,
      address: form.billingAddress || undefined,
      taxId: form.taxId || undefined,
    },
    purchaseOrderReference: form.purchaseOrderReference || undefined,
    transactionIds: selectedTransactions.map((transaction) => transaction.id),
    status: "DRAFT",
    pph23Rate: toNumber(form.pph23Rate),
    rentalDepositDeduction: toNumber(form.rentalDepositDeduction),
    notes: form.notes || undefined,
    lines,
  };
}

function generateInvoiceNumber(sequence: number): string {
  return `INV/${new Date().getFullYear()}/${String(sequence).padStart(6, "0")}`;
}

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ".")) || 0;
}

function getIssueErrorMessage(result: Extract<StoreActionResult<SalesInvoice>, { ok: false }>): string {
  if (result.reason === "duplicate-invoice-id") return "ID invoice sudah digunakan. Coba lagi.";
  if (result.reason === "duplicate-invoice-number") return "Nomor invoice sudah digunakan.";
  if (result.reason === "transaction-not-found") return "Ada transaksi yang tidak ditemukan. Muat ulang halaman.";
  if (result.reason === "transaction-not-eligible") return "Ada transaksi yang tidak lagi eligible.";
  if (result.reason === "validation-failed") return result.errors?.join(" ") ?? "Validasi invoice gagal.";
  return `Gagal menerbitkan invoice: ${result.reason}`;
}
