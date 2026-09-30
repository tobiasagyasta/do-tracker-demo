import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery-order";

export interface DeliveryOrderFilters {
  search: string;
  status: DeliveryOrderStatus | "ALL";
  partnerName: string;
  customerName: string;
  loadingDateFrom: string;
  loadingDateTo: string;
}

const tonnageFormatter = new Intl.NumberFormat("id-ID", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTonnage(value: number): string {
  return `${tonnageFormatter.format(value)} ton`;
}

export function getUniquePartners(orders: DeliveryOrder[]): string[] {
  return [...new Set(orders.map((order) => order.partnerName))].sort((a, b) =>
    a.localeCompare(b, "id-ID"),
  );
}

export function getUniqueCustomers(orders: DeliveryOrder[]): string[] {
  return [...new Set(orders.map((order) => order.customerName))].sort((a, b) =>
    a.localeCompare(b, "id-ID"),
  );
}

export function hasActiveDeliveryOrderFilters(
  filters: DeliveryOrderFilters,
): boolean {
  return (
    filters.search.trim() !== "" ||
    filters.status !== "ALL" ||
    filters.partnerName !== "ALL" ||
    filters.customerName !== "ALL" ||
    filters.loadingDateFrom !== "" ||
    filters.loadingDateTo !== ""
  );
}

export function filterDeliveryOrders(
  orders: DeliveryOrder[],
  filters: DeliveryOrderFilters,
): DeliveryOrder[] {
  const search = filters.search.trim().toLocaleLowerCase("id-ID");

  return orders.filter((order) => {
    const matchesSearch =
      search === "" ||
      [
        order.doNumber,
        order.truckPlate,
        order.driverName,
        order.partnerName,
        order.customerName,
      ].some((value) => value.toLocaleLowerCase("id-ID").includes(search));

    const matchesStatus =
      filters.status === "ALL" || order.status === filters.status;
    const matchesPartner =
      filters.partnerName === "ALL" || order.partnerName === filters.partnerName;
    const matchesCustomer =
      filters.customerName === "ALL" ||
      order.customerName === filters.customerName;
    const matchesDateFrom =
      filters.loadingDateFrom === "" || order.loadingDate >= filters.loadingDateFrom;
    const matchesDateTo =
      filters.loadingDateTo === "" || order.loadingDate <= filters.loadingDateTo;

    return (
      matchesSearch &&
      matchesStatus &&
      matchesPartner &&
      matchesCustomer &&
      matchesDateFrom &&
      matchesDateTo
    );
  });
}

export function sortDeliveryOrdersByNewest(
  orders: DeliveryOrder[],
): DeliveryOrder[] {
  return [...orders].sort((a, b) => b.loadingDate.localeCompare(a.loadingDate));
}

export function calculateGrossMargin(order: DeliveryOrder): number {
  return order.salesTotal - order.purchaseTotal;
}

export function calculateGrossMarginPercentage(order: DeliveryOrder): number {
  if (order.salesTotal === 0) {
    return 0;
  }

  return (calculateGrossMargin(order) / order.salesTotal) * 100;
}
