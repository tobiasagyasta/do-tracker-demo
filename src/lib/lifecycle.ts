import { calculatePartnerTransactionCost } from "@/lib/partner-recap";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import type { DeliveryOrder, DeliveryOrderTransaction, SalesInvoice } from "@/types/delivery-order";

export type TransactionLifecycleStatus =
  | "PARTNER_UNPAID"
  | "ELIGIBLE_UNINVOICED"
  | "INVOICED_UNPAID"
  | "COMPLETED";

export type ParentDeliveryOrderProgressStatus =
  | TransactionLifecycleStatus
  | "MIXED";

export interface ParentDeliveryOrderProgress {
  transactionCount: number;
  totalTonnage: number;
  partnerPaidCount: number;
  invoicedCount: number;
  customerPaidCount: number;
  status: ParentDeliveryOrderProgressStatus;
}

export const transactionLifecycleLabels: Record<TransactionLifecycleStatus, string> = {
  PARTNER_UNPAID: "Belum Dibayar Mitra",
  ELIGIBLE_UNINVOICED: "Siap Ditagih",
  INVOICED_UNPAID: "Invoice Belum Dibayar",
  COMPLETED: "Selesai",
};

export function getTransactionLifecycleStatus(
  transaction: DeliveryOrderTransaction,
  invoices: SalesInvoice[],
): TransactionLifecycleStatus {
  const invoice = transaction.salesInvoiceId
    ? invoices.find((candidate) => candidate.id === transaction.salesInvoiceId)
    : undefined;

  if (invoice?.status === "PAID") return "COMPLETED";
  if (invoice && invoice.status !== "CANCELLED") return "INVOICED_UNPAID";
  if (transaction.partnerPaymentStatus === "PAID") return "ELIGIBLE_UNINVOICED";
  return "PARTNER_UNPAID";
}

export function deriveParentDeliveryOrderProgress(
  transactions: DeliveryOrderTransaction[],
  invoices: SalesInvoice[],
): ParentDeliveryOrderProgress {
  const statuses = new Set<TransactionLifecycleStatus>();
  let partnerPaidCount = 0;
  let invoicedCount = 0;
  let customerPaidCount = 0;

  for (const transaction of transactions) {
    const status = getTransactionLifecycleStatus(transaction, invoices);
    statuses.add(status);

    if (transaction.partnerPaymentStatus === "PAID") partnerPaidCount += 1;

    const invoice = transaction.salesInvoiceId
      ? invoices.find((candidate) => candidate.id === transaction.salesInvoiceId)
      : undefined;

    if (invoice && invoice.status !== "CANCELLED") invoicedCount += 1;
    if (invoice?.status === "PAID") customerPaidCount += 1;
  }

  return {
    transactionCount: transactions.length,
    totalTonnage: transactions.reduce((total, transaction) => total + transaction.tonnage, 0),
    partnerPaidCount,
    invoicedCount,
    customerPaidCount,
    status: statuses.size === 1 ? [...statuses][0] : "MIXED",
  };
}

export function getParentTransactions(
  order: DeliveryOrder,
  transactions: DeliveryOrderTransaction[],
): DeliveryOrderTransaction[] {
  return transactions.filter((transaction) => transaction.deliveryOrderId === order.id);
}

export function calculateRealizedTransactionMargin(input: {
  transaction: DeliveryOrderTransaction;
  invoices: SalesInvoice[];
}): number {
  const invoice = input.transaction.salesInvoiceId
    ? input.invoices.find((candidate) => candidate.id === input.transaction.salesInvoiceId)
    : undefined;

  if (invoice?.status !== "PAID") return 0;

  const line = invoice.lines.find((candidate) => candidate.transactionId === input.transaction.id);
  if (!line) return 0;

  return line.lineTotal - calculatePartnerTransactionCost(input.transaction).totalPayment;
}

export function getOutstandingCustomerInvoiceAmount(invoices: SalesInvoice[]): number {
  return invoices
    .filter((invoice) => invoice.status === "ISSUED")
    .reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);
}
