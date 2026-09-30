import { calculatePartnerTransactionCost } from "@/lib/partner-recap";
import { calculateSalesInvoiceTotals } from "@/lib/invoice";
import {
  calculateRealizedTransactionMargin,
  deriveParentDeliveryOrderProgress,
  getParentTransactions,
  getTransactionLifecycleStatus,
  type ParentDeliveryOrderProgress,
  type ParentDeliveryOrderProgressStatus,
  type TransactionLifecycleStatus,
} from "@/lib/lifecycle";
import type { DeliveryOrder, DeliveryOrderTransaction, SalesInvoice } from "@/types/delivery-order";

export type DeliveryOrderProgressCounts = Record<ParentDeliveryOrderProgressStatus, number>;
export type TransactionLifecycleCounts = Record<TransactionLifecycleStatus, number>;

export interface DashboardMetrics {
  totalOrders: number;
  totalTransactions: number;
  statusCounts: DeliveryOrderProgressCounts;
  transactionCounts: TransactionLifecycleCounts;
  outstandingPartnerAmount: number;
  outstandingCustomerAmount: number;
  totalSalesAmount: number;
  realizedGrossMargin: number;
}

export interface RecentDeliveryOrderSummary {
  order: DeliveryOrder;
  progress: ParentDeliveryOrderProgress;
  salesAmount: number;
}

const emptyStatusCounts: DeliveryOrderProgressCounts = {
  PARTNER_UNPAID: 0,
  ELIGIBLE_UNINVOICED: 0,
  INVOICED_UNPAID: 0,
  COMPLETED: 0,
  MIXED: 0,
};

const emptyTransactionCounts: TransactionLifecycleCounts = {
  PARTNER_UNPAID: 0,
  ELIGIBLE_UNINVOICED: 0,
  INVOICED_UNPAID: 0,
  COMPLETED: 0,
};

export function getOperationalStatusCounts(input: {
  orders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}): DeliveryOrderProgressCounts {
  return input.orders.reduce<DeliveryOrderProgressCounts>((counts, order) => {
    const progress = deriveParentDeliveryOrderProgress(
      getParentTransactions(order, input.transactions),
      input.invoices,
    );

    return {
      ...counts,
      [progress.status]: counts[progress.status] + 1,
    };
  }, { ...emptyStatusCounts });
}

export function getTransactionLifecycleCounts(input: {
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}): TransactionLifecycleCounts {
  return input.transactions.reduce<TransactionLifecycleCounts>((counts, transaction) => {
    const status = getTransactionLifecycleStatus(transaction, input.invoices);

    return {
      ...counts,
      [status]: counts[status] + 1,
    };
  }, { ...emptyTransactionCounts });
}

export function getOutstandingPartnerAmount(transactions: DeliveryOrderTransaction[]): number {
  return transactions
    .filter((transaction) => transaction.partnerPaymentStatus !== "PAID")
    .reduce((total, transaction) => total + calculatePartnerTransactionCost(transaction).totalPayment, 0);
}

export function getOutstandingCustomerAmount(invoices: SalesInvoice[]): number {
  return invoices
    .filter((invoice) => invoice.status === "ISSUED")
    .reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);
}

export function getTotalSalesAmount(invoices: SalesInvoice[]): number {
  return invoices
    .filter((invoice) => invoice.status !== "CANCELLED")
    .reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);
}

export function getRealizedGrossMargin(input: {
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}): number {
  return input.transactions.reduce(
    (total, transaction) => total + calculateRealizedTransactionMargin({ transaction, invoices: input.invoices }),
    0,
  );
}

export function getDashboardMetrics(input: {
  orders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
}): DashboardMetrics {
  return {
    totalOrders: input.orders.length,
    totalTransactions: input.transactions.length,
    statusCounts: getOperationalStatusCounts(input),
    transactionCounts: getTransactionLifecycleCounts(input),
    outstandingPartnerAmount: getOutstandingPartnerAmount(input.transactions),
    outstandingCustomerAmount: getOutstandingCustomerAmount(input.invoices),
    totalSalesAmount: getTotalSalesAmount(input.invoices),
    realizedGrossMargin: getRealizedGrossMargin(input),
  };
}

export function getRecentDeliveryOrders(input: {
  orders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  invoices: SalesInvoice[];
  limit: number;
}): RecentDeliveryOrderSummary[] {
  return [...input.orders]
    .sort(
      (first, second) =>
        new Date(second.loadingDate).getTime() -
        new Date(first.loadingDate).getTime(),
    )
    .slice(0, input.limit)
    .map((order) => {
      const orderTransactions = getParentTransactions(order, input.transactions);
      const progress = deriveParentDeliveryOrderProgress(orderTransactions, input.invoices);
      const invoiceIds = new Set(orderTransactions.map((transaction) => transaction.salesInvoiceId).filter(Boolean));
      const salesAmount = input.invoices
        .filter((invoice) => invoiceIds.has(invoice.id) && invoice.status !== "CANCELLED")
        .reduce((total, invoice) => total + calculateSalesInvoiceTotals(invoice).grandTotal, 0);

      return { order, progress, salesAmount };
    });
}
