import type { DeliveryOrder } from "@/types/delivery-order";

export function canGeneratePaymentProof(order: DeliveryOrder): boolean {
  return Boolean(order.partnerPaidAt);
}

export function getPaymentProofNumber(order: DeliveryOrder): string {
  const year = order.loadingDate.slice(0, 4);
  const numericId = order.doNumber.replace(/\D/g, "").slice(-5) || "1";

  return `PAY/${year}/${numericId.padStart(5, "0")}`;
}

export function sanitizePaymentProofFileName(doNumber: string): string {
  return doNumber.replace(/[^a-zA-Z0-9-]+/g, "-").replace(/-+/g, "-");
}
