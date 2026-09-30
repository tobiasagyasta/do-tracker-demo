import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery-order";

export type DeliveryOrderStatusCounts = Record<DeliveryOrderStatus, number>;

export interface DashboardMetrics {
  totalOrders: number;
  statusCounts: DeliveryOrderStatusCounts;
  outstandingPartnerAmount: number;
  outstandingCustomerAmount: number;
  totalSalesAmount: number;
  realizedGrossMargin: number;
}

const emptyStatusCounts: DeliveryOrderStatusCounts = {
  UNPAID_PARTNER: 0,
  PARTNER_PAID_NOT_INVOICED: 0,
  WAITING_CUSTOMER_PAYMENT: 0,
  COMPLETED: 0,
};

export function getOperationalStatusCounts(
  orders: DeliveryOrder[],
): DeliveryOrderStatusCounts {
  return orders.reduce<DeliveryOrderStatusCounts>(
    (counts, order) => ({
      ...counts,
      [order.status]: counts[order.status] + 1,
    }),
    { ...emptyStatusCounts },
  );
}

export function getOutstandingPartnerAmount(orders: DeliveryOrder[]): number {
  return orders
    .filter((order) => !order.partnerPaidAt)
    .reduce((total, order) => total + order.purchaseTotal, 0);
}

export function getOutstandingCustomerAmount(orders: DeliveryOrder[]): number {
  return orders
    .filter((order) => order.salesInvoiceNumber && !order.customerPaidAt)
    .reduce((total, order) => total + order.salesTotal, 0);
}

export function getTotalSalesAmount(orders: DeliveryOrder[]): number {
  return orders
    .filter((order) => order.salesInvoiceNumber)
    .reduce((total, order) => total + order.salesTotal, 0);
}

export function getRealizedGrossMargin(orders: DeliveryOrder[]): number {
  return orders
    .filter((order) => order.status === "COMPLETED")
    .reduce((total, order) => total + order.salesTotal - order.purchaseTotal, 0);
}

export function getDashboardMetrics(orders: DeliveryOrder[]): DashboardMetrics {
  return {
    totalOrders: orders.length,
    statusCounts: getOperationalStatusCounts(orders),
    outstandingPartnerAmount: getOutstandingPartnerAmount(orders),
    outstandingCustomerAmount: getOutstandingCustomerAmount(orders),
    totalSalesAmount: getTotalSalesAmount(orders),
    realizedGrossMargin: getRealizedGrossMargin(orders),
  };
}

export function getRecentDeliveryOrders(
  orders: DeliveryOrder[],
  limit: number,
): DeliveryOrder[] {
  return [...orders]
    .sort(
      (first, second) =>
        new Date(second.loadingDate).getTime() -
        new Date(first.loadingDate).getTime(),
    )
    .slice(0, limit);
}
