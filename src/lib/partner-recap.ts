import type { DeliveryOrder, DeliveryOrderTransaction } from "@/types/delivery-order";

export const PARTNER_RECAP_LABEL = "Rekap Pembayaran Angkutan";

export interface PartnerRecapFilters {
  partnerName: string;
  dateFrom: string;
  dateTo: string;
  deliveryOrderId: string;
  paymentStatus: "ALL" | "PAID" | "UNPAID";
  category: string;
}

export interface PartnerRecapRow {
  transaction: DeliveryOrderTransaction;
  deliveryOrder: DeliveryOrder;
  haulingAmount: number;
  gasMoney: number;
  totalPayment: number;
}

export interface PartnerRecapTotals {
  totalTonnage: number;
  totalHauling: number;
  totalGasMoney: number;
  totalPayment: number;
}

export function calculatePartnerTransactionCost(transaction: DeliveryOrderTransaction) {
  const haulingAmount = transaction.tonnage * transaction.partnerRatePerTon;
  const gasMoney = transaction.gasMoney;

  return {
    haulingAmount,
    gasMoney,
    totalPayment: haulingAmount + gasMoney,
  };
}

export function buildPartnerRecapRows(input: {
  deliveryOrders: DeliveryOrder[];
  transactions: DeliveryOrderTransaction[];
  filters: PartnerRecapFilters;
}): PartnerRecapRow[] {
  const ordersById = new Map(input.deliveryOrders.map((order) => [order.id, order]));

  return input.transactions.flatMap((transaction) => {
    const order = ordersById.get(transaction.deliveryOrderId);
    if (!order) return [];

    const matchesPartner = input.filters.partnerName === "ALL" || order.partnerName === input.filters.partnerName;
    const matchesDateFrom = input.filters.dateFrom === "" || transaction.loadingDate >= input.filters.dateFrom;
    const matchesDateTo = input.filters.dateTo === "" || transaction.loadingDate <= input.filters.dateTo;
    const matchesOrder = input.filters.deliveryOrderId === "ALL" || transaction.deliveryOrderId === input.filters.deliveryOrderId;
    const matchesPaymentStatus =
      input.filters.paymentStatus === "ALL" || transaction.partnerPaymentStatus === input.filters.paymentStatus;
    const matchesCategory = input.filters.category === "ALL" || transaction.category === input.filters.category;

    if (!matchesPartner || !matchesDateFrom || !matchesDateTo || !matchesOrder || !matchesPaymentStatus || !matchesCategory) {
      return [];
    }

    return [{ transaction, deliveryOrder: order, ...calculatePartnerTransactionCost(transaction) }];
  });
}

export function calculatePartnerRecapTotals(rows: PartnerRecapRow[]): PartnerRecapTotals {
  return rows.reduce<PartnerRecapTotals>(
    (totals, row) => ({
      totalTonnage: totals.totalTonnage + row.transaction.tonnage,
      totalHauling: totals.totalHauling + row.haulingAmount,
      totalGasMoney: totals.totalGasMoney + row.gasMoney,
      totalPayment: totals.totalPayment + row.totalPayment,
    }),
    { totalTonnage: 0, totalHauling: 0, totalGasMoney: 0, totalPayment: 0 },
  );
}
