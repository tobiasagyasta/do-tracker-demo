import type { DeliveryOrderStatus } from "@/types/delivery-order";
import type { ParentDeliveryOrderProgressStatus } from "@/lib/lifecycle";

export type DeliveryOrderStatusLike = DeliveryOrderStatus | ParentDeliveryOrderProgressStatus;

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

export const deliveryOrderProgressLabels: Record<ParentDeliveryOrderProgressStatus, string> = {
  PARTNER_UNPAID: "Belum Dibayar ke Mitra",
  ELIGIBLE_UNINVOICED: "Siap Ditagih",
  INVOICED_UNPAID: "Menunggu Pembayaran Tambang",
  COMPLETED: "Lengkap",
  MIXED: "Campuran",
};

export const deliveryOrderProgressClasses: Record<ParentDeliveryOrderProgressStatus, string> = {
  PARTNER_UNPAID:
    "border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300",
  ELIGIBLE_UNINVOICED:
    "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-900/60 dark:bg-orange-950/40 dark:text-orange-300",
  INVOICED_UNPAID:
    "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/40 dark:text-blue-300",
  COMPLETED:
    "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/40 dark:text-emerald-300",
  MIXED:
    "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/40 dark:text-violet-300",
};

export function getDeliveryOrderStatusLabel(status: DeliveryOrderStatusLike): string {
  return deliveryOrderStatusLabels[status as DeliveryOrderStatus] ?? getDeliveryOrderProgressLabel(status as ParentDeliveryOrderProgressStatus);
}

export function getDeliveryOrderStatusClassName(
  status: DeliveryOrderStatusLike,
): string {
  return deliveryOrderStatusClasses[status as DeliveryOrderStatus] ?? getDeliveryOrderProgressClassName(status as ParentDeliveryOrderProgressStatus);
}

export function getDeliveryOrderProgressLabel(status: ParentDeliveryOrderProgressStatus): string {
  return deliveryOrderProgressLabels[status];
}

export function getDeliveryOrderProgressClassName(status: ParentDeliveryOrderProgressStatus): string {
  return deliveryOrderProgressClasses[status];
}
