import type { DeliveryOrderStatus } from "@/types/delivery-order";

export const deliveryOrderStatusLabels: Record<DeliveryOrderStatus, string> = {
  UNPAID_PARTNER: "Belum Dibayar ke Mitra",
  PARTNER_PAID_NOT_INVOICED: "Sudah Dibayar Mitra, Belum Ditagih",
  WAITING_CUSTOMER_PAYMENT: "Menunggu Pembayaran Tambang",
  COMPLETED: "Lengkap",
};

export const deliveryOrderStatusClasses: Record<DeliveryOrderStatus, string> = {
  UNPAID_PARTNER:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  PARTNER_PAID_NOT_INVOICED:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  WAITING_CUSTOMER_PAYMENT:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
};

export function getDeliveryOrderStatusLabel(status: DeliveryOrderStatus): string {
  return deliveryOrderStatusLabels[status];
}

export function getDeliveryOrderStatusClassName(
  status: DeliveryOrderStatus,
): string {
  return deliveryOrderStatusClasses[status];
}
