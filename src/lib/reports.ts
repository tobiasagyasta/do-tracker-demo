import type { DeliveryOrder, DeliveryOrderStatus } from "@/types/delivery-order";

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  partnerName: string;
  customerName: string;
  status: DeliveryOrderStatus | "ALL";
}

export interface CsvColumn<T> {
  header: string;
  value: (row: T) => string | number | undefined;
}

export function filterReportOrders(
  orders: DeliveryOrder[],
  filters: ReportFilters,
): DeliveryOrder[] {
  return orders.filter((order) => {
    const matchesDateFrom = filters.dateFrom === "" || order.loadingDate >= filters.dateFrom;
    const matchesDateTo = filters.dateTo === "" || order.loadingDate <= filters.dateTo;
    const matchesPartner =
      filters.partnerName === "ALL" || order.partnerName === filters.partnerName;
    const matchesCustomer =
      filters.customerName === "ALL" || order.customerName === filters.customerName;
    const matchesStatus = filters.status === "ALL" || order.status === filters.status;

    return (
      matchesDateFrom &&
      matchesDateTo &&
      matchesPartner &&
      matchesCustomer &&
      matchesStatus
    );
  });
}

export function hasActiveReportFilters(filters: ReportFilters): boolean {
  return (
    filters.dateFrom !== "" ||
    filters.dateTo !== "" ||
    filters.partnerName !== "ALL" ||
    filters.customerName !== "ALL" ||
    filters.status !== "ALL"
  );
}

export function exportCsv<T>(filename: string, rows: T[], columns: CsvColumn<T>[]) {
  const csvRows = [
    columns.map((column) => escapeCsvValue(column.header)).join(","),
    ...rows.map((row) =>
      columns.map((column) => escapeCsvValue(column.value(row) ?? "")).join(","),
    ),
  ];
  const blob = new Blob([`\uFEFF${csvRows.join("\r\n")}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

function escapeCsvValue(value: string | number): string {
  const stringValue = String(value);

  if (/[",\r\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}
